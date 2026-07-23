"""PayPal Orders v2 REST API client."""
import os
import logging
from typing import Optional
import requests

logger = logging.getLogger("paypal")

PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "Live").lower()
if PAYPAL_MODE.startswith("live"):
    BASE_URL = "https://api-m.paypal.com"
else:
    BASE_URL = "https://api-m.sandbox.paypal.com"

CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID")
CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET")


def get_access_token() -> str:
    if not CLIENT_ID or not CLIENT_SECRET:
        raise RuntimeError("PayPal credentials not configured")
    r = requests.post(
        f"{BASE_URL}/v1/oauth2/token",
        auth=(CLIENT_ID, CLIENT_SECRET),
        data={"grant_type": "client_credentials"},
        headers={"Accept": "application/json", "Accept-Language": "en_US"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def create_order(
    amount: float,
    campaign_id: str,
    campaign_title: str,
    return_url: str,
    cancel_url: str,
    brand_name: str = "Alyssia's Angels",
) -> dict:
    """Create a PayPal order. Returns dict with id, status, links."""
    token = get_access_token()
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": campaign_id,
                "custom_id": campaign_id,
                "description": f"Donation: {campaign_title[:100]}",
                "amount": {
                    "currency_code": "USD",
                    "value": f"{float(amount):.2f}",
                },
            }
        ],
        "application_context": {
            "return_url": return_url,
            "cancel_url": cancel_url,
            "brand_name": brand_name[:127],
            "user_action": "PAY_NOW",
            "shipping_preference": "NO_SHIPPING",
            "landing_page": "BILLING",
        },
    }
    r = requests.post(
        f"{BASE_URL}/v2/checkout/orders",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        json=payload,
        timeout=30,
    )
    if r.status_code >= 400:
        logger.error(f"PayPal create_order failed: {r.status_code} {r.text}")
        r.raise_for_status()
    return r.json()


def capture_order(order_id: str) -> dict:
    """Capture an approved PayPal order."""
    token = get_access_token()
    r = requests.post(
        f"{BASE_URL}/v2/checkout/orders/{order_id}/capture",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "Prefer": "return=representation",
        },
        timeout=30,
    )
    if r.status_code >= 400:
        # PayPal returns 422 if already captured
        body = r.text
        logger.error(f"PayPal capture_order failed: {r.status_code} {body}")
        if r.status_code == 422 and "ORDER_ALREADY_CAPTURED" in body:
            # Try fetching the order details instead
            return get_order(order_id)
        r.raise_for_status()
    return r.json()


def get_order(order_id: str) -> dict:
    token = get_access_token()
    r = requests.get(
        f"{BASE_URL}/v2/checkout/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def find_approval_url(order: dict) -> Optional[str]:
    for link in order.get("links", []):
        if link.get("rel") in ("approve", "payer-action"):
            return link.get("href")
    return None

