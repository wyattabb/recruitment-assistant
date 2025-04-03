import requests
import json
import time
import os
import base64
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def get_tenant_access_token():
    """获取 tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    data = {
        "app_id": os.getenv('FEISHU_APP_ID'),
        "app_secret": os.getenv('FEISHU_APP_SECRET')
    }
    response = requests.post(url, json=data)
    if response.status_code == 200:
        result = response.json()
        if result.get("code") == 0:
            return result.get("tenant_access_token")
    return None

def make_request(method, url, token=None, json_data=None, files=None):
    """统一的请求处理函数"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    if json_data:
        headers["Content-Type"] = "application/json"
    
    response = requests.request(method, url, headers=headers, json=json_data, files=files)
    if response.status_code == 200:
        result = response.json()
        if result.get("code") == 0:
            return result.get("data", {})
    return None

def process_file(file_path, app_token, table_id, field_name="简历"):
    """处理单个文件的上传和记录创建"""
    token = get_tenant_access_token()
    if not token:
        return False, "获取token失败"
    
    # 上传文件
    upload_result = upload_file(token, app_token, file_path)
    if not upload_result:
        return False, "文件上传失败"
    
    # 创建记录
    record_result = create_record(token, app_token, table_id, upload_result, field_name)
    if not record_result:
        return False, "创建记录失败"
    
    return True, "处理成功"

def upload_file(token, app_token, file_path):
    """上传文件到飞书云空间"""
    upload_url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    
    with open(file_path, 'rb') as f:
        files = {
            'file': (file_name, f.read(), 'application/pdf'),
            'parent_type': (None, 'bitable'),
            'parent_node': (None, app_token),
            'file_name': (None, file_name),
            'size': (None, str(file_size))
        }
        
        result = make_request("POST", upload_url, token, files=files)
        if result:
            return {
                "file_token": result.get("file_token"),
                "name": file_name,
                "size": file_size
            }
    return None

def create_record(token, app_token, table_id, file_info, field_name="简历"):
    """创建新记录"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
    data = {
        "fields": {
            field_name: [{
                "file_token": file_info["file_token"],
                "name": file_info["name"],
                "type": "pdf"
            }]
        }
    }
    return make_request("POST", url, token, json_data=data) is not None

def get_existing_resumes(app_token, table_id):
    """获取已有简历信息"""
    token = get_tenant_access_token()
    if not token:
        return {}
    
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
    existing_files = {}
    page_token = None
    
    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token
            
        result = make_request("GET", url, token, json_data=params)
        if not result:
            break
            
        records = result.get("items", [])
        for record in records:
            fields = record.get("fields", {})
            table_name = fields.get("姓名", "")
            resume_files = fields.get("简历", [])
            
            for file in resume_files:
                if isinstance(file, dict) and "file_token" in file:
                    file_key = f"{file['name']}_{file.get('size', 0)}"
                    existing_files[file_key] = {
                        "name": file["name"],
                        "size": file.get("size", 0),
                        "file_token": file["file_token"],
                        "field_name": "简历",
                        "table_name": table_name
                    }
        
        page_token = result.get("page_token")
        if not page_token:
            break
    
    return existing_files

def extract_name(text):
    """从文件名或表格字段中提取姓名"""
    # 移除扩展名
    name = text.rsplit('.', 1)[0]
    
    # 如果包含【】，取出【】之后的部分
    if '】' in name:
        name = name.split('】')[-1].strip()
    
    # 处理可能的空格分隔
    parts = name.split()
    if parts:
        # 取第一个部分（通常是姓名）
        name = parts[0]
    
    # 如果还有 _ 或 - 分割，取第一部分
    if '_' in name:
        name = name.split('_')[0]
    elif '-' in name:
        name = name.split('-')[0]
    
    return name.strip()

def process_local_files():
    """处理本地文件夹中的所有PDF文件"""
    target_app_token = os.getenv('FEISHU_APP_TOKEN')
    target_table_id = os.getenv('FEISHU_TABLE_ID')
    cv_folder = os.getenv('DOWNLOAD_DIR')
    
    existing_files = get_existing_resumes(target_app_token, target_table_id)
    pdf_files = [f for f in os.listdir(cv_folder) if f.endswith('.pdf')]
    
    for pdf_file in pdf_files:
        # 确保 cv_folder 不为 None，如果为 None 则使用默认值
        pdf_path = os.path.join(cv_folder if cv_folder is not None else "", pdf_file)
        file_key = f"{pdf_file}_{os.path.getsize(pdf_path)}"
        
        # 检查重复
        if is_duplicate(file_key, extract_name(pdf_file), existing_files):
            print(f"跳过重复文件: {pdf_file}")
            continue
        
        # 处理文件
        success, message = process_file(pdf_path, target_app_token, target_table_id)
        print(f"{pdf_file}: {message}")

def is_duplicate(file_key, name, existing_files):
    """检查文件是否重复"""
    # 完全匹配
    if file_key in existing_files:
        return True
    
    # 姓名匹配
    for info in existing_files.values():
        if extract_name(info['name']) == name:
            return True
    
    return False

if __name__ == "__main__":
    process_local_files()