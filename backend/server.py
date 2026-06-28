from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import asyncio
import csv as csv_module
import requests
import resend
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

import secrets
import bcrypt
import jwt
import paypal_client
from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    Request,
    Response,
    UploadFile,
    File,
    Form,
    Header,
    Query,
)
from fastapi.responses import StreamingResponse, PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import io

# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ledger")

# ---------- MongoDB ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- Constants ----------
JWT_ALGORITHM = "HS256"
JWT_ACCESS_MINUTES = 60 * 24  # 1 day for convenience
APP_NAME = os.environ.get("APP_NAME", "ledger-crowdfunding")

# Resend
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "admin@platform.com")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
PLATFORM_NAME = os.environ.get("PLATFORM_NAME", "Alyssia's Angels")
EMAIL_VERIFICATION_TTL_HOURS = 24
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Brute-force protection
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


# ---------- App ----------
app = FastAPI(title="Platform Ledger Crowdfunding")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def d2(x) -> float:
    """Round to 2 decimal places."""
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


PLATFORM_FEE_RATE = 0.13  # 13% flat fee covers payment processing & banking charges


def process_donation(gross: float) -> dict:
    """Flat 13% fee. Fundraiser receives the remaining 87%.

    - gross: the full donation amount (what counts as "amount raised")
    - fundraiser_share / net: gross - 13% (what counts as "net earned" and is
      withdrawable since the last payout)
    - The 13% covers PayPal processing + banking + admin overhead in one bucket.
    """
    fee = gross * PLATFORM_FEE_RATE
    fundraiser_share = gross - fee
    return {
        # Kept for backwards compat with admin queries / CSV exports.
        # The 13% fee is now a single bucket covering payment + banking.
        "paypal_fee_deducted": 0.0,
        "platform_fee_deducted": d2(fee),
        "fundraiser_share": d2(fundraiser_share),
        "settled_cash": d2(fundraiser_share),
    }


# ---------- Email helpers ----------
def _email_html_wrap(title: str, body_html: str, cta_text: Optional[str] = None, cta_url: Optional[str] = None) -> str:
    cta = ""
    if cta_text and cta_url:
        cta = f"""
        <tr><td style="padding:24px 0 8px 0;">
          <a href="{cta_url}" style="background:#059669;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block;font-family:Arial,sans-serif;">{cta_text}</a>
        </td></tr>"""
    return f"""<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <tr><td style="padding-bottom:12px;">
            <span style="display:inline-block;background:#1E3A8A;color:#fff;font-weight:700;padding:6px 12px;border-radius:8px;font-size:12px;letter-spacing:2px;">{PLATFORM_NAME.upper()}</span>
          </td></tr>
          <tr><td><h1 style="color:#1E3A8A;font-size:22px;margin:8px 0 16px 0;">{title}</h1></td></tr>
          <tr><td style="color:#334155;font-size:14px;line-height:1.6;">{body_html}</td></tr>
          {cta}
          <tr><td style="padding-top:24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
            You're receiving this because you have activity on {PLATFORM_NAME}.
          </td></tr>
        </table>
      </td></tr>
    </table></body></html>"""


async def send_email_async(to_email: str, subject: str, html: str) -> None:
    """Fire-and-forget email send. Logs errors but never raises."""
    if not RESEND_API_KEY:
        logger.warning(f"RESEND_API_KEY not set; skipping email to {to_email}")
        return
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email} ({subject}) id={result.get('id')}")
    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")


def schedule_email(to_email: str, subject: str, html: str) -> None:
    """Schedule an email without blocking the request."""
    try:
        asyncio.create_task(send_email_async(to_email, subject, html))
    except RuntimeError:
        # No running loop; run synchronously as fallback
        try:
            asyncio.run(send_email_async(to_email, subject, html))
        except Exception as e:
            logger.error(f"schedule_email fallback failed: {e}")


# ---------- Auth dependency ----------
async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("_id", None)
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def require_verified_fundraiser(user: dict = Depends(get_current_user)) -> dict:
    """Block fundraiser actions until email is verified. Admins are always allowed."""
    if user.get("role") == "admin":
        return user
    if user.get("role") != "fundraiser":
        raise HTTPException(status_code=403, detail="Fundraisers only")
    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Please verify your email address to perform this action. Check your inbox for the verification link.",
        )
    return user


# ---------- Pydantic Models ----------
class RegisterIn(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class CampaignCreateIn(BaseModel):
    title: str
    description: str
    category: str  # Medical, Memorial, Education, Creative
    goal_amount: float
    image_url: Optional[str] = None


class CampaignEditIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    goal_amount: Optional[float] = None
    image_url: Optional[str] = None  # pass empty string "" to clear
    status: Optional[str] = None  # Active | Paused (owner-allowed); admin can set anything


class CampaignUpdatePayPalIn(BaseModel):
    paypal_button_url: str
    status: Optional[str] = "Active"


class LogDonationIn(BaseModel):
    campaign_id: str
    donor_name: Optional[str] = "Anonymous"
    gross_amount: float


class PayoutRequestIn(BaseModel):
    campaign_id: str
    amount_requested: float
    payout_paypal_email: Optional[EmailStr] = None  # kept for backward-compat; bank is now primary
    payout_method: Optional[str] = "bank"  # "bank" | "paypal"


class BankDetailsIn(BaseModel):
    account_holder_name: str
    bank_name: str
    bank_country: str
    account_number: Optional[str] = ""  # e.g. US ACH / local account number
    iban: Optional[str] = ""  # European / international
    swift_bic: Optional[str] = ""
    routing_number: Optional[str] = ""  # US routing / sort code
    bank_address: Optional[str] = ""
    reference: Optional[str] = ""  # e.g. customer reference


class PayoutDecisionIn(BaseModel):
    payout_id: str
    decision: str  # Approved | Paid | Rejected
    admin_notes: Optional[str] = None


class KycSubmitIn(BaseModel):
    legal_name: str
    document_path: str  # storage path returned by /api/upload


class KycReviewIn(BaseModel):
    user_id: str
    decision: str  # verified | rejected
    rejection_reason: Optional[str] = None


class CommentIn(BaseModel):
    campaign_id: str
    body: str
    display_name: Optional[str] = None  # Used only for anonymous (no token)


class DonateCreateIn(BaseModel):
    campaign_id: str
    amount: float
    donor_name: Optional[str] = "Anonymous"


class DonateCaptureIn(BaseModel):
    order_id: str


class CampaignUpdateIn(BaseModel):
    title: str
    body: str
    image_url: Optional[str] = None


class ResendVerifyIn(BaseModel):
    email: EmailStr


# ---------- Object Storage (Cloudflare R2) ----------
import boto3
from botocore.client import Config

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")
R2_ENDPOINT = os.environ.get("R2_ENDPOINT")

_r2_client = None


def get_r2_client():
    global _r2_client
    if _r2_client:
        return _r2_client
    if not all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME]):
        logger.warning("R2 storage env vars not fully set; storage disabled")
        return None
    _r2_client = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    return _r2_client


def put_object(path: str, data: bytes, content_type: str) -> dict:
    client = get_r2_client()
    if not client:
        raise HTTPException(status_code=500, detail="Storage not available")
    client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=path,
        Body=data,
        ContentType=content_type,
    )
    return {"path": path, "size": len(data)}


def get_object(path: str):
    client = get_r2_client()
    if not client:
        raise HTTPException(status_code=500, detail="Storage not available")
    obj = client.get_object(Bucket=R2_BUCKET_NAME, Key=path)
    data = obj["Body"].read()
    content_type = obj.get("ContentType", "application/octet-stream")
    return data, content_type


# ---------- Routes ----------
@api.get("/")
async def root():
    return {"message": "Platform Ledger Crowdfunding API", "status": "ok"}


# ---- Auth ----
async def _create_verification_token(user_id: str, email: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_TTL_HOURS)
    await db.email_verification_tokens.insert_one(
        {
            "token": token,
            "user_id": user_id,
            "email": email,
            "expires_at": expires_at,
            "used": False,
            "created_at": now_iso(),
        }
    )
    return token


def _send_verification_email(full_name: str, email: str, token: str) -> None:
    base = (FRONTEND_URL or "").rstrip("/")
    link = f"{base}/verify-email?token={token}" if base else f"/verify-email?token={token}"
    body_html = f"""
      <p>Hi {full_name or 'there'},</p>
      <p>Welcome to {PLATFORM_NAME}! Please confirm your email address to activate your fundraiser account.</p>
      <p>This link expires in {EMAIL_VERIFICATION_TTL_HOURS} hours.</p>
    """
    html = _email_html_wrap(
        "Verify your email",
        body_html,
        "Verify email",
        link,
    )
    schedule_email(email, f"Verify your {PLATFORM_NAME} account", html)
    # Always log so admins/devs can grab the link if Resend not configured
    logger.info(f"VERIFICATION_LINK for {email}: {link}")


@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower().strip()
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "full_name": body.full_name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "fundraiser",
        "requires_password_change": False,
        "email_verified": False,
        "payout_paypal_email": None,
        "identity_verified": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    # Send verification email
    token = await _create_verification_token(user["id"], user["email"])
    _send_verification_email(user["full_name"], user["email"], token)
    # Issue access token so user can land on dashboard (limited until verified)
    access = create_access_token(user["id"], user["email"], user["role"])
    return {
        "token": access,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "requires_password_change": False,
            "email_verified": False,
        },
        "verification_sent": True,
    }


@api.post("/auth/verify-email")
async def verify_email(token: str = Query(...)):
    rec = await db.email_verification_tokens.find_one({"token": token})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    expires_at = rec.get("expires_at")
    if isinstance(expires_at, str):
        try:
            expires_at = datetime.fromisoformat(expires_at)
        except Exception:
            expires_at = None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    user = await db.users.find_one({"id": rec["user_id"]}, {"_id": 0, "password_hash": 0})

    # Idempotency: if the token was already used and the user is now verified,
    # return success. This protects against double-clicks, browser prefetchers,
    # React StrictMode double-mounts, etc.
    if rec.get("used"):
        if user and user.get("email_verified"):
            return {"ok": True, "email": rec["email"], "user": user, "already": True}
        raise HTTPException(status_code=400, detail="This verification link has already been used")

    if not expires_at or datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification link has expired. Request a new one.")

    await db.users.update_one(
        {"id": rec["user_id"]}, {"$set": {"email_verified": True}}
    )
    await db.email_verification_tokens.update_one(
        {"token": token}, {"$set": {"used": True, "used_at": now_iso()}}
    )
    user = await db.users.find_one({"id": rec["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "email": rec["email"], "user": user}


@api.post("/auth/resend-verification")
async def resend_verification(body: ResendVerifyIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    # Always return ok to avoid email enumeration
    if not user or user.get("email_verified"):
        return {"ok": True}
    # Invalidate prior unused tokens for this user
    await db.email_verification_tokens.update_many(
        {"user_id": user["id"], "used": False},
        {"$set": {"used": True, "used_at": now_iso(), "invalidated": True}},
    )
    token = await _create_verification_token(user["id"], email)
    _send_verification_email(user.get("full_name", ""), email, token)
    return {"ok": True}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower().strip()
    # Key brute-force on email so attempts aren't split across ingress pods
    ident = f"email:{email}"

    # Check lockout
    record = await db.login_attempts.find_one({"identifier": ident})
    if record:
        locked_until = record.get("locked_until")
        if locked_until:
            try:
                lu = datetime.fromisoformat(locked_until)
                if lu.tzinfo is None:
                    lu = lu.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) < lu:
                    remaining = int((lu - datetime.now(timezone.utc)).total_seconds() / 60) + 1
                    raise HTTPException(
                        status_code=429,
                        detail=f"Too many failed attempts. Try again in {remaining} minute(s).",
                    )
            except HTTPException:
                raise
            except Exception:
                pass

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        # Increment failed attempts
        new_count = (record.get("count", 0) if record else 0) + 1
        update: dict = {
            "$set": {
                "identifier": ident,
                "count": new_count,
                "last_attempt": now_iso(),
            }
        }
        if new_count >= MAX_LOGIN_ATTEMPTS:
            lock_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            update["$set"]["locked_until"] = lock_until.isoformat()
        await db.login_attempts.update_one(
            {"identifier": ident}, update, upsert=True
        )
        if new_count >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes.",
            )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Successful login â€” clear attempts
    await db.login_attempts.delete_one({"identifier": ident})

    token = create_access_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "full_name": user.get("full_name", ""),
            "email": user["email"],
            "role": user["role"],
            "requires_password_change": user.get("requires_password_change", False),
            "email_verified": user.get("email_verified", False),
        },
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "full_name": user.get("full_name", ""),
        "email": user["email"],
        "role": user["role"],
        "requires_password_change": user.get("requires_password_change", False),
        "email_verified": user.get("email_verified", False),
        "payout_paypal_email": user.get("payout_paypal_email"),
        "bank_details": user.get("bank_details"),
        "identity_verified": user.get("identity_verified", False),
        "kyc_status": user.get("kyc_status", "none"),  # none | pending | verified | rejected
        "kyc_legal_name": user.get("kyc_legal_name"),
        "kyc_document_path": user.get("kyc_document_path"),
        "kyc_rejection_reason": user.get("kyc_rejection_reason"),
    }


@api.post("/auth/change-password")
async def change_password(
    body: PasswordChangeIn, user: dict = Depends(get_current_user)
):
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": hash_password(body.new_password),
                "requires_password_change": False,
            }
        },
    )
    return {"ok": True}


# ---- Upload ----
@api.post("/upload")
async def upload(
    file: UploadFile = File(...),
    category: str = Form("general"),
    entity_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only image uploads allowed")
    ext = (file.filename or "img").split(".")[-1].lower() if "." in (file.filename or "") else "bin"

    safe_category = category if category in {"campaign", "kyc", "profile", "general"} else "general"

    if safe_category == "campaign" and entity_id:
        path = f"{APP_NAME}/campaigns/{entity_id}/{uuid.uuid4()}.{ext}"
    elif safe_category == "kyc":
        path = f"{APP_NAME}/kyc/{user['id']}/{uuid.uuid4()}.{ext}"
    elif safe_category == "profile":
        path = f"{APP_NAME}/profile/{user['id']}/{uuid.uuid4()}.{ext}"
    else:
        path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"

    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 8MB upload")
    result = put_object(path, data, file.content_type)
    await db.files.insert_one(
        {
            "id": str(uuid.uuid4()),
            "owner_id": user["id"],
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": result["size"],
            "category": safe_category,
            "entity_id": entity_id,
            "is_deleted": False,
            "created_at": now_iso(),
        }
    )
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@api.get("/files/{file_path:path}")
async def get_file(file_path: str):
    # Public file serving (campaign images are public)
    record = await db.files.find_one(
        {"storage_path": file_path, "is_deleted": False}
    )
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, ctype = get_object(file_path)
    return StreamingResponse(io.BytesIO(data), media_type=record.get("content_type", ctype))


# ---- Campaigns ----
_SHARE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o/1/i/l (ambiguous)


def _new_share_code(length: int = 7) -> str:
    return "".join(secrets.choice(_SHARE_ALPHABET) for _ in range(length))


async def _generate_unique_share_code() -> str:
    for _ in range(10):
        code = _new_share_code()
        existing = await db.campaigns.find_one({"share_code": code})
        if not existing:
            return code
    return _new_share_code(9)


@api.post("/campaigns")
async def create_campaign(body: CampaignCreateIn, user: dict = Depends(require_verified_fundraiser)):
    if body.goal_amount < 1:
        raise HTTPException(status_code=400, detail="Goal must be at least $1")
    if body.category not in {"Medical", "Memorial", "Education", "Creative"}:
        raise HTTPException(status_code=400, detail="Invalid category")
    share_code = await _generate_unique_share_code()
    campaign = {
        "id": str(uuid.uuid4()),
        "share_code": share_code,
        "user_id": user["id"],
        "creator_name": user.get("full_name", ""),
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category,
        "goal_amount": d2(body.goal_amount),
        "current_balance_gross": 0.0,
        "current_balance_net": 0.0,
        "available_for_payout": 0.0,
        "status": "Active",
        "paypal_button_url": None,
        "image_url": body.image_url,
        "created_at": now_iso(),
    }
    await db.campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return campaign


@api.get("/api/c/{share_code}")
async def resolve_share_code(share_code: str):
    c = await db.campaigns.find_one(
        {"share_code": share_code.lower()}, {"_id": 0}
    )
    if not c:
        raise HTTPException(status_code=404, detail="Share link not found")
    return c


@api.get("/campaigns")
async def list_campaigns(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    mine: bool = Query(False),
    authorization: Optional[str] = Header(None),
):
    q = {}
    if category and category != "All":
        q["category"] = category
    if status:
        q["status"] = status
    else:
        # Public: only Active
        if not mine:
            q["status"] = {"$in": ["Active", "Completed"]}

    if mine:
        # Need auth
        user = await get_current_user(authorization)
        q["user_id"] = user["id"]

    cursor = db.campaigns.find(q, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(500)
    return items


@api.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    c = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return c


@api.patch("/campaigns/{campaign_id}")
async def edit_campaign(
    campaign_id: str,
    body: CampaignEditIn,
    user: dict = Depends(require_verified_fundraiser),
):
    c = await db.campaigns.find_one({"id": campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    is_admin = user.get("role") == "admin"
    if c["user_id"] != user["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="You can only edit your own campaigns")

    update = {}
    if body.title is not None:
        t = body.title.strip()
        if not t:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        update["title"] = t
    if body.description is not None:
        d = body.description.strip()
        if not d:
            raise HTTPException(status_code=400, detail="Description cannot be empty")
        update["description"] = d
    if body.category is not None:
        if body.category not in {"Medical", "Memorial", "Education", "Creative"}:
            raise HTTPException(status_code=400, detail="Invalid category")
        update["category"] = body.category
    if body.goal_amount is not None:
        if body.goal_amount < 1:
            raise HTTPException(status_code=400, detail="Goal must be at least $1")
        if body.goal_amount < c.get("current_balance_gross", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Goal can't be lower than amount already raised (${c.get('current_balance_gross', 0):.2f})",
            )
        update["goal_amount"] = d2(body.goal_amount)
    if body.image_url is not None:
        update["image_url"] = body.image_url or None
    if body.status is not None:
        allowed_owner = {"Active", "Paused"}
        allowed_admin = {"Active", "Paused", "Completed", "Rejected", "Removed"}
        allowed = allowed_admin if is_admin else allowed_owner
        if body.status not in allowed:
            raise HTTPException(status_code=400, detail=f"Status must be one of {sorted(allowed)}")
        update["status"] = body.status

    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    update["updated_at"] = now_iso()
    update["last_edited_by"] = user["id"]
    await db.campaigns.update_one({"id": campaign_id}, {"$set": update})
    c2 = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return c2


@api.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    user: dict = Depends(require_verified_fundraiser),
):
    c = await db.campaigns.find_one({"id": campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    is_admin = user.get("role") == "admin"
    if c["user_id"] != user["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="You can only delete your own campaigns")
    # Block delete if any donations have come in (keep ledger integrity)
    if c.get("current_balance_gross", 0) > 0 and not is_admin:
        raise HTTPException(
            status_code=400,
            detail="This campaign has received donations and can't be deleted. Pause it instead, or contact support.",
        )
    await db.campaigns.delete_one({"id": campaign_id})
    await db.campaign_updates.delete_many({"campaign_id": campaign_id})
    await db.comments.delete_many({"campaign_id": campaign_id})
    return {"ok": True}


@api.get("/fundraisers")
async def list_fundraisers():
    """Public directory of creators (users) with at least one active campaign."""
    pipeline = [
        {"$match": {"status": {"$in": ["Active", "Completed"]}}},
        {
            "$group": {
                "_id": "$user_id",
                "creator_name": {"$first": "$creator_name"},
                "campaigns_count": {"$sum": 1},
                "total_raised": {"$sum": "$current_balance_gross"},
                "campaign_titles": {"$push": "$title"},
                "categories": {"$addToSet": "$category"},
                "latest_campaign_at": {"$max": "$created_at"},
                "first_image": {"$first": "$image_url"},
            }
        },
        {"$sort": {"total_raised": -1}},
        {"$limit": 200},
    ]
    items = await db.campaigns.aggregate(pipeline).to_list(200)
    out = []
    for it in items:
        out.append(
            {
                "user_id": it["_id"],
                "creator_name": it.get("creator_name") or "Anonymous Fundraiser",
                "campaigns_count": it.get("campaigns_count", 0),
                "total_raised": d2(it.get("total_raised", 0)),
                "campaign_titles": it.get("campaign_titles", [])[:3],
                "categories": it.get("categories", []),
                "latest_campaign_at": it.get("latest_campaign_at"),
                "first_image": it.get("first_image"),
            }
        )
    return out


@api.get("/fundraisers/{user_id}/campaigns")
async def get_fundraiser_campaigns(user_id: str):
    items = (
        await db.campaigns.find(
            {"user_id": user_id, "status": {"$in": ["Active", "Completed"]}},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .to_list(200)
    )
    return items


@api.get("/campaigns/{campaign_id}/donations")
async def get_campaign_donations(campaign_id: str):
    items = (
        await db.ledger_transactions.find({"campaign_id": campaign_id}, {"_id": 0})
        .sort("timestamp", -1)
        .to_list(200)
    )
    # Public view: hide platform_fee_deducted from public
    public = [
        {
            "transaction_id": t["transaction_id"],
            "donor_name": t.get("donor_name", "Anonymous"),
            "gross_amount": t["gross_amount"],
            "timestamp": t["timestamp"],
        }
        for t in items
    ]
    return public


# ---- Campaign Updates ----
@api.get("/campaigns/{campaign_id}/updates")
async def list_campaign_updates(campaign_id: str):
    items = (
        await db.campaign_updates.find(
            {"campaign_id": campaign_id, "is_deleted": {"$ne": True}}, {"_id": 0}
        )
        .sort("created_at", -1)
        .to_list(200)
    )
    return items


@api.post("/campaigns/{campaign_id}/updates")
async def post_campaign_update(
    campaign_id: str,
    body: CampaignUpdateIn,
    user: dict = Depends(require_verified_fundraiser),
):
    c = await db.campaigns.find_one({"id": campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only the campaign owner can post updates")

    title = body.title.strip()
    text = body.body.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title required")
    if len(title) > 120:
        raise HTTPException(status_code=400, detail="Title too long (max 120 chars)")
    if not text:
        raise HTTPException(status_code=400, detail="Update body required")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Update too long (max 5000 chars)")

    update = {
        "update_id": str(uuid.uuid4()),
        "campaign_id": campaign_id,
        "author_id": user["id"],
        "author_name": user.get("full_name", "Fundraiser"),
        "title": title,
        "body": text,
        "image_url": body.image_url,
        "created_at": now_iso(),
        "is_deleted": False,
    }
    await db.campaign_updates.insert_one(update)
    update.pop("_id", None)
    return update


@api.delete("/campaigns/{campaign_id}/updates/{update_id}")
async def delete_campaign_update(
    campaign_id: str,
    update_id: str,
    user: dict = Depends(get_current_user),
):
    upd = await db.campaign_updates.find_one({"update_id": update_id, "campaign_id": campaign_id})
    if not upd:
        raise HTTPException(status_code=404, detail="Update not found")
    if upd["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only the author can delete this update")
    await db.campaign_updates.update_one(
        {"update_id": update_id}, {"$set": {"is_deleted": True}}
    )
    return {"ok": True}


# ---- Admin: campaign management ----
@api.get("/admin/campaigns")
async def admin_list_campaigns(admin: dict = Depends(require_admin)):
    items = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api.post("/admin/campaigns/{campaign_id}/paypal")
async def admin_assign_paypal(
    campaign_id: str,
    body: CampaignUpdatePayPalIn,
    admin: dict = Depends(require_admin),
):
    c = await db.campaigns.find_one({"id": campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    was_pending = c.get("status") == "Pending" or not c.get("paypal_button_url")
    new_status = body.status or "Active"
    await db.campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "paypal_button_url": body.paypal_button_url.strip(),
                "status": new_status,
            }
        },
    )
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})

    # Email fundraiser if campaign just went Active
    if was_pending and new_status == "Active":
        owner = await db.users.find_one({"id": updated["user_id"]})
        if owner:
            link = f"{FRONTEND_URL}/campaigns/{campaign_id}"
            body_html = f"""
              <p>Hi {owner.get('full_name', 'there')},</p>
              <p>Great news â€” your campaign <strong>{updated['title']}</strong> is now live and ready to receive donations.</p>
              <p>Share it with your network to start raising support.</p>
            """
            html = _email_html_wrap(
                "Your campaign is live",
                body_html,
                "View campaign",
                link,
            )
            schedule_email(owner["email"], f"Your campaign is live: {updated['title']}", html)

    return updated


@api.post("/admin/donations/log")
async def admin_log_donation(body: LogDonationIn, admin: dict = Depends(require_admin)):
    if body.gross_amount < 5:
        raise HTTPException(status_code=400, detail="Minimum donation is $5")
    c = await db.campaigns.find_one({"id": body.campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    split = process_donation(body.gross_amount)
    tx = {
        "transaction_id": str(uuid.uuid4()),
        "campaign_id": body.campaign_id,
        "donor_name": (body.donor_name or "Anonymous").strip() or "Anonymous",
        "gross_amount": d2(body.gross_amount),
        "paypal_fee_deducted": split["paypal_fee_deducted"],
        "platform_fee_deducted": split["platform_fee_deducted"],
        "fundraiser_share": split["fundraiser_share"],
        "timestamp": now_iso(),
        "logged_by_admin_id": admin["id"],
    }
    await db.ledger_transactions.insert_one(tx)
    await db.campaigns.update_one(
        {"id": body.campaign_id},
        {
            "$inc": {
                "current_balance_gross": d2(body.gross_amount),
                "current_balance_net": split["fundraiser_share"],
                "available_for_payout": split["fundraiser_share"],
            }
        },
    )
    tx.pop("_id", None)
    return tx


@api.get("/admin/transactions")
async def admin_transactions(admin: dict = Depends(require_admin)):
    items = (
        await db.ledger_transactions.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .to_list(1000)
    )
    return items


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    pipeline = [
        {
            "$group": {
                "_id": None,
                "gross": {"$sum": "$gross_amount"},
                "platform_profit": {"$sum": "$platform_fee_deducted"},
                "fundraiser": {"$sum": "$fundraiser_share"},
                "paypal_fees": {"$sum": "$paypal_fee_deducted"},
                "count": {"$sum": 1},
            }
        }
    ]
    agg = await db.ledger_transactions.aggregate(pipeline).to_list(1)
    totals = agg[0] if agg else {"gross": 0, "platform_profit": 0, "fundraiser": 0, "paypal_fees": 0, "count": 0}
    totals.pop("_id", None)
    campaigns_count = await db.campaigns.count_documents({})
    pending_payouts = await db.payout_requests.count_documents({"payout_status": "Pending"})
    users_count = await db.users.count_documents({"role": {"$in": ["fundraiser", "user"]}})
    return {
        "gross": d2(totals.get("gross", 0)),
        "platform_profit": d2(totals.get("platform_profit", 0)),
        "fundraiser_total": d2(totals.get("fundraiser", 0)),
        "paypal_fees": d2(totals.get("paypal_fees", 0)),
        "donations_count": totals.get("count", 0),
        "campaigns_count": campaigns_count,
        "users_count": users_count,
        "pending_payouts": pending_payouts,
    }


# ---- Payouts ----
@api.put("/users/me/bank-details")
async def save_bank_details(body: BankDetailsIn, user: dict = Depends(get_current_user)):
    holder = body.account_holder_name.strip()
    bank = body.bank_name.strip()
    country = body.bank_country.strip()
    if not holder or not bank or not country:
        raise HTTPException(
            status_code=400,
            detail="Account holder name, bank name and country are required",
        )
    # Require at least one of IBAN, account number, or SWIFT/BIC + account number
    iban = (body.iban or "").strip()
    acct = (body.account_number or "").strip()
    swift = (body.swift_bic or "").strip()
    if not iban and not acct:
        raise HTTPException(
            status_code=400,
            detail="Provide at least an IBAN or an account number",
        )
    bank_details = {
        "account_holder_name": holder,
        "bank_name": bank,
        "bank_country": country,
        "account_number": acct,
        "iban": iban,
        "swift_bic": swift,
        "routing_number": (body.routing_number or "").strip(),
        "bank_address": (body.bank_address or "").strip(),
        "reference": (body.reference or "").strip(),
        "updated_at": now_iso(),
    }
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"bank_details": bank_details}}
    )
    return {"ok": True, "bank_details": bank_details}


@api.get("/users/me/bank-details")
async def get_bank_details(user: dict = Depends(get_current_user)):
    return user.get("bank_details") or {}


@api.post("/payouts/request")
async def request_payout(body: PayoutRequestIn, user: dict = Depends(require_verified_fundraiser)):
    c = await db.campaigns.find_one({"id": body.campaign_id, "user_id": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found or not yours")
    available = float(c.get("available_for_payout", 0))
    if body.amount_requested <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if body.amount_requested > available + 0.001:
        raise HTTPException(
            status_code=400, detail=f"Requested exceeds available balance (${available:.2f})"
        )
    method = (body.payout_method or "bank").lower()
    if method not in {"bank", "paypal"}:
        raise HTTPException(status_code=400, detail="Invalid payout method")

    user_full = await db.users.find_one({"id": user["id"]})
    bank = user_full.get("bank_details") or {}

    if method == "bank":
        if not bank or not bank.get("account_holder_name"):
            raise HTTPException(
                status_code=400,
                detail="Please save your bank details on your profile before requesting a bank payout",
            )
        payout_destination = {"type": "bank", "bank_details": bank}
    else:
        email = (body.payout_paypal_email or user_full.get("payout_paypal_email") or "").lower().strip()
        if not email:
            raise HTTPException(
                status_code=400,
                detail="Provide a PayPal email or switch to a bank payout",
            )
        payout_destination = {"type": "paypal", "paypal_email": email}
        await db.users.update_one({"id": user["id"]}, {"$set": {"payout_paypal_email": email}})

    payout = {
        "payout_id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "user_name": user.get("full_name", ""),
        "campaign_id": body.campaign_id,
        "campaign_title": c["title"],
        "amount_requested": d2(body.amount_requested),
        "payout_method": method,
        "payout_destination": payout_destination,
        # Legacy field for older admin views
        "payout_paypal_email": (payout_destination.get("paypal_email")
                                if method == "paypal" else None),
        "payout_status": "Pending",
        "requested_at": now_iso(),
        "processed_at": None,
        "admin_notes": None,
        "expected_settlement": "2â€“5 business days from approval",
    }
    # Lock the funds
    await db.campaigns.update_one(
        {"id": body.campaign_id},
        {"$inc": {"available_for_payout": -d2(body.amount_requested)}},
    )
    await db.payout_requests.insert_one(payout)
    payout.pop("_id", None)

    # Notify admin with full destination details
    link = f"{FRONTEND_URL}/admin"
    if method == "bank":
        dest_html = f"""
          <strong>Payout method:</strong> Bank transfer<br/>
          <strong>Account holder:</strong> {bank.get('account_holder_name', '')}<br/>
          <strong>Bank:</strong> {bank.get('bank_name', '')} ({bank.get('bank_country', '')})<br/>
          <strong>IBAN:</strong> {bank.get('iban') or 'â€”'}<br/>
          <strong>Account #:</strong> {bank.get('account_number') or 'â€”'}<br/>
          <strong>SWIFT/BIC:</strong> {bank.get('swift_bic') or 'â€”'}<br/>
          <strong>Routing / sort code:</strong> {bank.get('routing_number') or 'â€”'}<br/>
          <strong>Bank address:</strong> {bank.get('bank_address') or 'â€”'}<br/>
          <strong>Reference:</strong> {bank.get('reference') or 'â€”'}<br/>
        """
    else:
        dest_html = f"<strong>Payout method:</strong> PayPal<br/><strong>PayPal email:</strong> {payout_destination.get('paypal_email', '')}<br/>"

    admin_html = _email_html_wrap(
        "New payout request",
        f"""
          <p><strong>{user.get('full_name', '')}</strong> ({user['email']}) just requested a payout.</p>
          <p><strong>Campaign:</strong> {c['title']}<br/>
          <strong>Amount:</strong> ${d2(body.amount_requested):.2f}<br/>
          {dest_html}
          <strong>Identity verified:</strong> {'Yes' if user_full.get('identity_verified') else 'No â€” review KYC first'}</p>
          <p>Settlement window: 2â€“5 business days from approval.</p>
        """,
        "Review in admin panel",
        link,
    )
    schedule_email(ADMIN_NOTIFICATION_EMAIL, f"New payout request on {PLATFORM_NAME}", admin_html)

    return payout


@api.get("/payouts/mine")
async def my_payouts(user: dict = Depends(get_current_user)):
    items = (
        await db.payout_requests.find({"user_id": user["id"]}, {"_id": 0})
        .sort("requested_at", -1)
        .to_list(500)
    )
    return items


@api.get("/admin/payouts")
async def admin_payouts(admin: dict = Depends(require_admin)):
    items = (
        await db.payout_requests.find({}, {"_id": 0})
        .sort("requested_at", -1)
        .to_list(1000)
    )
    return items


@api.post("/admin/payouts/decision")
async def admin_payout_decision(body: PayoutDecisionIn, admin: dict = Depends(require_admin)):
    if body.decision not in {"Approved", "Paid", "Rejected"}:
        raise HTTPException(status_code=400, detail="Invalid decision")
    p = await db.payout_requests.find_one({"payout_id": body.payout_id})
    if not p:
        raise HTTPException(status_code=404, detail="Payout not found")
    if p["payout_status"] in {"Paid", "Rejected"}:
        raise HTTPException(status_code=400, detail="Already finalized")

    # Gate Approve/Paid on identity_verified
    if body.decision in {"Approved", "Paid"}:
        owner = await db.users.find_one({"id": p["user_id"]})
        if not owner or not owner.get("identity_verified", False):
            raise HTTPException(
                status_code=400,
                detail="Fundraiser must complete identity verification before payouts can be approved.",
            )

    update = {
        "payout_status": body.decision,
        "processed_at": now_iso(),
        "admin_notes": body.admin_notes,
    }
    await db.payout_requests.update_one({"payout_id": body.payout_id}, {"$set": update})

    # If rejected, return funds back to the campaign's available_for_payout
    if body.decision == "Rejected":
        await db.campaigns.update_one(
            {"id": p["campaign_id"]},
            {"$inc": {"available_for_payout": float(p["amount_requested"])}},
        )
    updated = await db.payout_requests.find_one({"payout_id": body.payout_id}, {"_id": 0})

    # Notify fundraiser
    subject_map = {
        "Approved": "Your payout was approved",
        "Paid": "Your payout has been paid",
        "Rejected": "Your payout was rejected",
    }
    intro_map = {
        "Approved": "Good news â€” your payout request has been approved and is queued for processing.",
        "Paid": "Your funds have been sent to your PayPal account.",
        "Rejected": "Unfortunately, your payout request was rejected. The funds have been returned to your campaign balance.",
    }
    notes_html = (
        f"<p style='background:#f1f5f9;padding:12px;border-radius:10px;'><strong>Note from admin:</strong> {body.admin_notes}</p>"
        if body.admin_notes
        else ""
    )
    fundraiser_html = _email_html_wrap(
        subject_map[body.decision],
        f"""
          <p>Hi {p.get('user_name', 'there')},</p>
          <p>{intro_map[body.decision]}</p>
          <p><strong>Campaign:</strong> {p['campaign_title']}<br/>
          <strong>Amount:</strong> ${float(p['amount_requested']):.2f}<br/>
          <strong>PayPal email:</strong> {p['payout_paypal_email']}</p>
          {notes_html}
        """,
        "Open dashboard",
        f"{FRONTEND_URL}/dashboard",
    )
    schedule_email(p["user_email"], subject_map[body.decision], fundraiser_html)

    return updated


# ---------- Dashboard summary ----------
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    gross = sum(float(c.get("current_balance_gross", 0)) for c in campaigns)
    net = sum(float(c.get("current_balance_net", 0)) for c in campaigns)
    available = sum(float(c.get("available_for_payout", 0)) for c in campaigns)
    pending = await db.payout_requests.count_documents(
        {"user_id": user["id"], "payout_status": "Pending"}
    )
    return {
        "campaign_count": len(campaigns),
        "gross_total": d2(gross),
        "net_total": d2(net),
        "available_for_payout": d2(available),
        "pending_payouts": pending,
    }


# ---------- Donations via PayPal API ----------
@api.post("/donate/create")
async def donate_create(body: DonateCreateIn):
    if body.amount < 5:
        raise HTTPException(status_code=400, detail="Minimum donation is $5")
    c = await db.campaigns.find_one({"id": body.campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if c.get("status") not in {"Active"}:
        raise HTTPException(status_code=400, detail="Campaign is not accepting donations")

    base = FRONTEND_URL.rstrip("/")
    return_url = f"{base}/donate/return?campaign_id={body.campaign_id}"
    cancel_url = f"{base}/donate/cancel?campaign_id={body.campaign_id}"

    try:
        order = paypal_client.create_order(
            amount=d2(body.amount),
            campaign_id=body.campaign_id,
            campaign_title=c["title"],
            return_url=return_url,
            cancel_url=cancel_url,
            brand_name=PLATFORM_NAME,
        )
    except Exception as e:
        logger.error(f"PayPal create_order error: {e}")
        raise HTTPException(status_code=502, detail="PayPal could not create order. Please try again.")

    approval = paypal_client.find_approval_url(order)
    if not approval:
        raise HTTPException(status_code=502, detail="PayPal did not return an approval URL")

    # Persist intent
    await db.donation_orders.insert_one(
        {
            "order_id": order.get("id"),
            "campaign_id": body.campaign_id,
            "amount": d2(body.amount),
            "donor_name": (body.donor_name or "Anonymous").strip()[:80] or "Anonymous",
            "status": "created",
            "created_at": now_iso(),
        }
    )

    return {"order_id": order.get("id"), "approval_url": approval, "status": order.get("status")}


@api.post("/donate/capture")
async def donate_capture(body: DonateCaptureIn):
    order_id = body.order_id.strip()
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id required")

    # Check if we've already processed this order
    existing_tx = await db.ledger_transactions.find_one({"paypal_order_id": order_id})
    if existing_tx:
        return {"ok": True, "already_captured": True, "transaction_id": existing_tx["transaction_id"]}

    intent = await db.donation_orders.find_one({"order_id": order_id})
    if not intent:
        raise HTTPException(status_code=404, detail="Order not recognized")

    try:
        captured = paypal_client.capture_order(order_id)
    except Exception as e:
        logger.error(f"PayPal capture failed: {e}")
        raise HTTPException(status_code=502, detail="PayPal capture failed")

    status = captured.get("status", "")
    if status not in {"COMPLETED", "APPROVED"}:
        raise HTTPException(status_code=400, detail=f"PayPal status: {status}")

    # Extract amount + payer
    try:
        pu = captured.get("purchase_units", [{}])[0]
        cap = pu.get("payments", {}).get("captures", [{}])[0]
        amount_str = cap.get("amount", {}).get("value") or pu.get("amount", {}).get("value")
        gross_amount = float(amount_str)
    except Exception:
        gross_amount = float(intent["amount"])

    payer = captured.get("payer", {})
    payer_name = " ".join(filter(None, [payer.get("name", {}).get("given_name"), payer.get("name", {}).get("surname")])).strip()
    donor_name = intent.get("donor_name") or "Anonymous"
    if payer_name and donor_name == "Anonymous":
        donor_name = payer_name

    split = process_donation(gross_amount)

    tx = {
        "transaction_id": str(uuid.uuid4()),
        "campaign_id": intent["campaign_id"],
        "donor_name": donor_name,
        "donor_email": payer.get("email_address"),
        "gross_amount": d2(gross_amount),
        "paypal_fee_deducted": split["paypal_fee_deducted"],
        "platform_fee_deducted": split["platform_fee_deducted"],
        "fundraiser_share": split["fundraiser_share"],
        "timestamp": now_iso(),
        "paypal_order_id": order_id,
        "source": "paypal_api",
    }
    await db.ledger_transactions.insert_one(tx)
    await db.campaigns.update_one(
        {"id": intent["campaign_id"]},
        {
            "$inc": {
                "current_balance_gross": d2(gross_amount),
                "current_balance_net": split["fundraiser_share"],
                "available_for_payout": split["fundraiser_share"],
            }
        },
    )
    await db.donation_orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": "captured", "captured_at": now_iso()}},
    )

    tx.pop("_id", None)
    return {"ok": True, "transaction_id": tx["transaction_id"], "amount": tx["gross_amount"], "campaign_id": tx["campaign_id"]}


@api.get("/donate/order/{order_id}")
async def donate_order_status(order_id: str):
    intent = await db.donation_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not intent:
        raise HTTPException(status_code=404, detail="Order not found")
    return intent


# ---------- KYC (Identity Verification) ----------
@api.post("/kyc/submit")
async def kyc_submit(body: KycSubmitIn, user: dict = Depends(get_current_user)):
    if not body.legal_name.strip():
        raise HTTPException(status_code=400, detail="Legal name required")
    if not body.document_path.strip():
        raise HTTPException(status_code=400, detail="Document required")
    # Verify the document file exists and belongs to user
    file_rec = await db.files.find_one(
        {"storage_path": body.document_path, "owner_id": user["id"], "is_deleted": False}
    )
    if not file_rec:
        raise HTTPException(status_code=404, detail="Document file not found")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "kyc_status": "pending",
                "kyc_legal_name": body.legal_name.strip(),
                "kyc_document_path": body.document_path,
                "kyc_submitted_at": now_iso(),
                "kyc_rejection_reason": None,
            }
        },
    )
    return {"ok": True, "kyc_status": "pending"}


@api.get("/admin/kyc")
async def admin_kyc_list(admin: dict = Depends(require_admin)):
    items = await db.users.find(
        {"kyc_status": {"$in": ["pending", "verified", "rejected"]}},
        {"_id": 0, "password_hash": 0},
    ).sort("kyc_submitted_at", -1).to_list(500)
    return items


@api.post("/admin/kyc/review")
async def admin_kyc_review(body: KycReviewIn, admin: dict = Depends(require_admin)):
    if body.decision not in {"verified", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid decision")
    target = await db.users.find_one({"id": body.user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    update = {
        "kyc_status": body.decision,
        "identity_verified": body.decision == "verified",
        "kyc_reviewed_at": now_iso(),
        "kyc_rejection_reason": body.rejection_reason if body.decision == "rejected" else None,
    }
    await db.users.update_one({"id": body.user_id}, {"$set": update})
    return {"ok": True, "kyc_status": body.decision}


# ---------- Comments ----------
@api.get("/campaigns/{campaign_id}/comments")
async def list_comments(campaign_id: str):
    items = await db.comments.find(
        {"campaign_id": campaign_id, "is_deleted": {"$ne": True}}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return items


@api.post("/comments")
async def post_comment(
    body: CommentIn, authorization: Optional[str] = Header(None)
):
    text = (body.body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    if len(text) > 1000:
        raise HTTPException(status_code=400, detail="Comment too long (max 1000 chars)")
    c = await db.campaigns.find_one({"id": body.campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    author_id = None
    author_name = (body.display_name or "Anonymous").strip()[:60] or "Anonymous"
    is_anonymous = True
    if authorization and authorization.startswith("Bearer "):
        try:
            user = await get_current_user(authorization)
            author_id = user["id"]
            author_name = user.get("full_name") or author_name
            is_anonymous = False
        except HTTPException:
            pass  # accept as anonymous

    comment = {
        "comment_id": str(uuid.uuid4()),
        "campaign_id": body.campaign_id,
        "author_id": author_id,
        "author_name": author_name,
        "is_anonymous": is_anonymous,
        "body": text,
        "created_at": now_iso(),
        "is_deleted": False,
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)
    return comment


@api.delete("/admin/comments/{comment_id}")
async def admin_delete_comment(comment_id: str, admin: dict = Depends(require_admin)):
    result = await db.comments.update_one(
        {"comment_id": comment_id}, {"$set": {"is_deleted": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"ok": True}


# ---------- CSV Exports ----------
def _csv_response(rows: List[dict], columns: List[str], filename: str) -> Response:
    output = io.StringIO()
    writer = csv_module.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for r in rows:
        writer.writerow({c: r.get(c, "") for c in columns})
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@api.get("/admin/export/ledger.csv")
async def export_ledger(admin: dict = Depends(require_admin)):
    txs = await db.ledger_transactions.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(2000)
    by_id = {c["id"]: c for c in campaigns}
    for t in txs:
        c = by_id.get(t.get("campaign_id"))
        t["campaign_title"] = c["title"] if c else ""
        t["campaign_owner"] = c.get("creator_name", "") if c else ""
    columns = [
        "transaction_id", "timestamp", "campaign_id", "campaign_title", "campaign_owner",
        "donor_name", "gross_amount", "paypal_fee_deducted",
        "platform_fee_deducted", "fundraiser_share",
    ]
    return _csv_response(txs, columns, "ledger.csv")


@api.get("/admin/export/payouts.csv")
async def export_payouts(admin: dict = Depends(require_admin)):
    payouts = await db.payout_requests.find({}, {"_id": 0}).sort("requested_at", -1).to_list(10000)
    columns = [
        "payout_id", "requested_at", "processed_at", "payout_status",
        "user_email", "user_name", "campaign_title",
        "amount_requested", "payout_paypal_email", "admin_notes",
    ]
    return _csv_response(payouts, columns, "payouts.csv")


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.campaigns.create_index("id", unique=True)
    await db.campaigns.create_index("user_id")
    await db.ledger_transactions.create_index("campaign_id")
    await db.payout_requests.create_index("user_id")
    await db.login_attempts.create_index("identifier", unique=True)
    await db.comments.create_index("campaign_id")
    await db.campaign_updates.create_index("campaign_id")
    await db.donation_orders.create_index("order_id", unique=True)
    await db.ledger_transactions.create_index("paypal_order_id", sparse=True)
    await db.email_verification_tokens.create_index("token", unique=True)
    await db.email_verification_tokens.create_index("user_id")
    await db.campaigns.create_index("share_code", unique=True, sparse=True)
    # Backfill share_code for any legacy campaigns
    async for c in db.campaigns.find({"share_code": {"$exists": False}}, {"id": 1}):
        code = "".join(
            secrets.choice("abcdefghjkmnpqrstuvwxyz23456789") for _ in range(7)
        )
        await db.campaigns.update_one({"id": c["id"]}, {"$set": {"share_code": code}})

    # Seed admin
    admin_email = os.environ["ADMIN_EMAIL"].lower().strip()
    admin_password = os.environ["ADMIN_PASSWORD"]
    admin_full_name = os.environ.get("ADMIN_FULL_NAME", "Platform Admin")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "full_name": admin_full_name,
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "requires_password_change": False,
                "email_verified": True,
                "identity_verified": True,
                "payout_paypal_email": None,
                "created_at": now_iso(),
            }
        )
        logger.info(f"Seeded admin: {admin_email}")
    elif os.environ.get("RESET_ADMIN_ON_START", "").lower() in {"1", "true", "yes"}:
        await db.users.update_one(
            {"email": admin_email},
            {
                "$set": {
                    "password_hash": hash_password(admin_password),
                    "requires_password_change": False,
                    "email_verified": True,
                    "role": "admin",
                    "full_name": admin_full_name,
                }
            },
        )
        logger.info(f"Admin password reset to seed value: {admin_email}")
    else:
        # Ensure admin role + verified flags are correct (idempotent)
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"role": "admin", "email_verified": True}},
        )
        logger.info(f"Admin already exists: {admin_email}")

    # Initialize storage (best effort)
@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)


