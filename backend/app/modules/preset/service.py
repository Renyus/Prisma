from sqlalchemy.orm import Session
from app.modules.preset.models import PresetModel
from app.schemas.preset import SillyTavernPreset

def create_preset(db: Session, raw_json: dict):
    # 1. 检查数据
    preset = SillyTavernPreset(**raw_json)
    
    # 2. 提取来源 (比如 "openai", "claude")
    source_type = preset.chat_completion_source
    
    # 3. 尝试给它起个名 (预设文件里通常没有标准 name 字段，我们拼凑一下)
    # 优先找 openrouter_model, 没有就找 openai_model...
    model_name = (
        preset.openrouter_model or 
        preset.openai_model or 
        preset.claude_model or 
        "Unknown Model"
    )
    display_name = f"{source_type} - {model_name}"

    # 4. 入库
    db_obj = PresetModel(
        name=display_name,
        source=source_type,
        data=raw_json
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_preset(db: Session, preset_id: int):
    return db.query(PresetModel).filter(PresetModel.id == preset_id).first()