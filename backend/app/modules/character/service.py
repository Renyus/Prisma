from sqlalchemy.orm import Session
from app.modules.character.models import CharacterModel
from app.schemas.character import TavernCardV3

def create_character(db: Session, raw_json: dict):
    # 1. 用模具检查数据 (如果不合格会自动报错)
    card = TavernCardV3(**raw_json)
    
    # 2. 提取要写在索引卡上的信息 (名字、作者)
    # 注意：V3 标准里名字通常在 data.name
    char_name = card.data.name
    char_creator = card.data.creator
    
    # 3. 打包入库
    db_obj = CharacterModel(
        name=char_name,
        creator=char_creator,
        data=raw_json,  # 原样存入完整 JSON
        # avatar_path 暂时留空，以后做图片上传再填
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj) # 刷新一下，拿回数据库生成的 ID
    return db_obj

def get_character(db: Session, char_id: int):
    # 去仓库找 ID 对应的货
    return db.query(CharacterModel).filter(CharacterModel.id == char_id).first()