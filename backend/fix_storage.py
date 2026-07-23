"""
Run this script from inside your 'backend' folder to automatically swap
the Emergent object storage code for Cloudflare R2 storage code.
"""
import re

FILE = "server.py"

NEW_BLOCK = '''# ---------- Object Storage (Cloudflare R2) ----------
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
    return {"path": path}


def get_object(path: str):
    client = get_r2_client()
    if not client:
        raise HTTPException(status_code=500, detail="Storage not available")
    obj = client.get_object(Bucket=R2_BUCKET_NAME, Key=path)
    data = obj["Body"].read()
    content_type = obj.get("ContentType", "application/octet-stream")
    return data, content_type


# ---------- Routes ----------'''

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original_len = len(content)

pattern = re.compile(
    r"# ---------- Object Storage ----------.*?# ---------- Routes ----------",
    re.DOTALL,
)
content, n1 = pattern.subn(NEW_BLOCK, content)

content, n2 = re.subn(
    r'^STORAGE_URL = "https://integrations\.emergentagent\.com/objstore/api/v1/storage"\n'
    r'EMERGENT_KEY = os\.environ\.get\("EMERGENT_LLM_KEY"\)\n',
    "",
    content,
    flags=re.MULTILINE,
)

content, n3 = re.subn(
    r"^storage_key: Optional\[str\] = None\n",
    "",
    content,
    flags=re.MULTILINE,
)

content, n4 = re.subn(
    r"^\s*init_storage\(\)\s*\n",
    "",
    content,
    flags=re.MULTILINE,
)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Object Storage block replaced: {n1} match(es)")
print(f"Old STORAGE_URL/EMERGENT_KEY lines removed: {n2} match(es)")
print(f"storage_key declaration removed: {n3} match(es)")
print(f"init_storage() call removed: {n4} match(es)")
print(f"File size before: {original_len} chars, after: {len(content)} chars")

if n1 == 0:
    print("WARNING: Could not find the Object Storage block. Check server.py manually.")
