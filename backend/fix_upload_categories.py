import re

FILE = "server.py"

NEW_BLOCK = """# ---- Upload ----
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
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}"""

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(
    r'# ---- Upload ----\n@api\.post\("/upload"\).*?return \{"path": result\["path"\], "url": f"/api/files/\{result\[.path.\]\}"\}',
    re.DOTALL,
)
content, n = pattern.subn(NEW_BLOCK, content)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Upload route replaced: {n} match(es)")
if n == 0:
    print("WARNING: pattern not found, check server.py manually")
