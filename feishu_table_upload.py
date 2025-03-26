import requests
import json
import time
import os
import base64
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 飞书应用凭证
APP_ID = os.getenv('FEISHU_APP_ID')
APP_SECRET = os.getenv('FEISHU_APP_SECRET')

def get_tenant_access_token():
    """获取 tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "app_id": APP_ID,
        "app_secret": APP_SECRET
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"获取token响应: {response.text}")
    
    if response.status_code == 200:
        response_data = response.json()
        if response_data.get("code") == 0:
            return response_data.get("tenant_access_token")
    return None

def get_app_access_token():
    """获取 app_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "app_id": APP_ID,
        "app_secret": APP_SECRET
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"获取app_token响应: {response.text}")
    
    if response.status_code == 200:
        response_data = response.json()
        if response_data.get("code") == 0:
            return response_data.get("app_access_token")
    return None

def list_bitables():
    """列出所有可访问的多维表格"""
    token = get_tenant_access_token()
    if not token:
        print("获取 token 失败")
        return
    
    url = "https://open.feishu.cn/open-apis/bitable/v1/apps"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers)
    print(f"获取多维表格列表响应: {response.text}")
    
    if response.status_code == 200:
        response_data = response.json()
        if response_data.get("code") == 0:
            items = response_data.get("data", {}).get("items", [])
            for item in items:
                print(f"表格名称: {item.get('name')}, app_token: {item.get('app_token')}")
    else:
        print(f"获取多维表格列表失败: {response.text}")

def create_new_table_and_insert():
    """创建新的多维表格并插入数据"""
    try:
        # 获取 tenant_access_token
        token = get_tenant_access_token()
        if not token:
            print("获取 token 失败")
            return
        
        print(f"获取到的 token: {token}")
        
        # 1. 创建多维表格
        create_url = "https://open.feishu.cn/open-apis/bitable/v1/apps"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        create_data = {
            "name": f"测试表格_{int(time.time())}"  # 添加时间戳避免重名
        }
        
        print("正在创建多维表格...")
        create_response = requests.post(create_url, headers=headers, json=create_data)
        print(f"创建多维表格响应: {create_response.text}")
        
        if create_response.status_code != 200:
            print("创建多维表格失败")
            return
            
        create_result = create_response.json()
        if create_result.get("code") != 0:
            print(f"创建多维表格失败: {create_result.get('msg')}")
            return
            
        # 修正这里：正确获取 app_token
        app_token = create_result.get("data", {}).get("app", {}).get("app_token")
        print(f"创建的多维表格 app_token: {app_token}")
        
        # 2. 获取默认数据表
        tables_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables"
        
        print("正在获取数据表列表...")
        tables_response = requests.get(tables_url, headers=headers)
        print(f"获取数据表列表响应: {tables_response.text}")
        
        if tables_response.status_code != 200:
            print("获取数据表列表失败")
            return
            
        tables_result = tables_response.json()
        if tables_result.get("code") != 0:
            print(f"获取数据表列表失败: {tables_result.get('msg')}")
            return
            
        tables = tables_result.get("data", {}).get("items", [])
        if not tables:
            print("没有找到数据表")
            return
            
        table_id = tables[0].get("table_id")
        print(f"使用数据表 ID: {table_id}")
        
        # 3. 获取字段信息
        fields_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
        
        print("正在获取字段信息...")
        fields_response = requests.get(fields_url, headers=headers)
        print(f"获取字段信息响应: {fields_response.text}")
        
        if fields_response.status_code != 200:
            print("获取字段信息失败")
            return
            
        fields_result = fields_response.json()
        if fields_result.get("code") != 0:
            print(f"获取字段信息失败: {fields_result.get('msg')}")
            return
            
        fields = fields_result.get("data", {}).get("items", [])
        field_map = {}
        for field in fields:
            field_name = field.get("field_name")
            field_id = field.get("field_id")
            field_type = field.get("type")
            field_map[field_name] = {"id": field_id, "type": field_type}
            print(f"字段: {field_name}, ID: {field_id}, 类型: {field_type}")
        
        # 4. 插入记录
        record_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create"
        
        # 根据实际字段调整数据
        record_data = {
            "records": [
                {
                    "fields": {
                        "文本": "张三"
                    }
                },
                {
                    "fields": {
                        "文本": "李四"
                    }
                }
            ]
        }
        
        print("正在插入记录...")
        print(f"请求URL: {record_url}")
        print(f"请求数据: {json.dumps(record_data, ensure_ascii=False)}")
        
        record_response = requests.post(record_url, headers=headers, json=record_data)
        print(f"插入记录响应: {record_response.text}")
        
        if record_response.status_code == 200:
            record_result = record_response.json()
            if record_result.get("code") == 0:
                print("成功插入记录！")
                records = record_result.get("data", {}).get("records", [])
                for i, record in enumerate(records):
                    record_id = record.get("record_id")
                    print(f"记录 {i+1} ID: {record_id}")
            else:
                print(f"插入记录失败: {record_result.get('msg')}")
        else:
            print(f"请求失败: {record_response.text}")
        
        print("\n表格访问信息:")
        print(f"多维表格 app_token: {app_token}")
        print(f"数据表 ID: {table_id}")
            
    except Exception as e:
        print(f"发生异常: {str(e)}")
        import traceback
        print(f"详细异常信息:\n{traceback.format_exc()}")

# 修改 append_record_and_upload_file 函数，确保使用正确的字段名
def append_record_and_upload_file(app_token, table_id, file_path, record_fields=None):
    """向表格追加一条记录并上传文件附件"""
    try:
        # 获取 tenant_access_token
        token = get_tenant_access_token()
        if not token:
            print("获取 token 失败")
            return False
        
        # 1. 先获取表格字段信息，确保表格存在并了解字段结构
        fields_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        print("正在获取表格字段信息...")
        fields_response = requests.get(fields_url, headers=headers)
        print(f"获取字段信息响应: {fields_response.text}")
        
        if fields_response.status_code != 200:
            print(f"获取字段信息失败: {fields_response.status_code}")
            return False
            
        fields_result = fields_response.json()
        if fields_result.get("code") != 0:
            print(f"获取字段信息失败: {fields_result.get('msg')}")
            return False
            
        # 分析字段信息，找到文本字段和附件字段
        fields = fields_result.get("data", {}).get("items", [])
        text_field_name = None
        attachment_field_name = "简历"  # 直接使用"简历"作为附件字段名
        
        # 查找姓名或其他文本字段
        for field in fields:
            field_name = field.get("field_name")
            field_type = field.get("type")
            print(f"字段: {field_name}, 类型: {field_type}")
            
            if field_name == "姓名" or field_type == "text":
                text_field_name = field_name
                break
        
        if not text_field_name:
            print("未找到合适的文本字段，将使用第一个字段")
            if fields:
                text_field_name = fields[0].get("field_name")
            else:
                text_field_name = "姓名"  # 默认使用"姓名"
        
        # 2. 创建一条新记录
        create_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        # 从文件名中提取姓名信息
        file_name = os.path.basename(file_path)
        name_match = file_name.split("】")[-1].replace(".pdf", "")
        
        # 如果没有提供字段数据，使用默认值
        if not record_fields:
            record_fields = {
                text_field_name: name_match  # 使用提取的姓名
            }
        
        create_data = {
            "fields": record_fields
        }
        
        print("正在创建新记录...")
        print(f"创建记录请求数据: {json.dumps(create_data, ensure_ascii=False)}")
        create_response = requests.post(create_url, headers=headers, json=create_data)
        print(f"创建记录响应: {create_response.text}")
        
        if create_response.status_code != 200:
            print(f"创建记录失败: {create_response.status_code}")
            return False
            
        create_result = create_response.json()
        if create_result.get("code") != 0:
            print(f"创建记录失败: {create_result.get('msg')}")
            return False
            
        # 获取新创建的记录ID
        record_id = create_result.get("data", {}).get("record", {}).get("record_id")
        if not record_id:
            print("获取记录ID失败")
            return False
            
        print(f"成功创建记录，ID: {record_id}")
        
        # 3. 上传文件并添加到记录
        # 修改上传附件函数调用，传入正确的附件字段名
        result = upload_file_to_attachment_simple(app_token, table_id, record_id, file_path, attachment_field_name)
        if result:
            print(f"成功向记录 {record_id} 添加文件附件")
            # 获取并显示表格的URL
            table_url = get_bitable_url(app_token)
            print(f"可以通过以下地址访问表格: {table_url}")
            return True
        else:
            print(f"向记录 {record_id} 添加文件附件失败")
            return False
            
    except Exception as e:
        print(f"追加记录并上传文件异常: {str(e)}")
        import traceback
        print(f"详细异常信息:\n{traceback.format_exc()}")
        return False

# 修改上传附件函数，支持自定义附件字段名
def upload_file_to_attachment_simple(app_token, table_id, record_id, file_path, attachment_field_name="附件"):
    """使用简单方式上传文件到附件字段"""
    try:
        # 获取 tenant_access_token
        token = get_tenant_access_token()
        if not token:
            print("获取 token 失败")
            return False
        
        # 1. 直接上传文件
        upload_url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
        
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        # 读取文件内容
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # 准备上传请求
        headers = {
            "Authorization": f"Bearer {token}"
            # 不要手动设置 Content-Type，让 requests 自动处理
        }
        
        # 修改文件上传参数
        files = {
            'file': (file_name, file_content, 'application/pdf'),
            'parent_type': (None, 'bitable'),
            'parent_node': (None, app_token),
            'file_name': (None, file_name),
            'size': (None, str(file_size))
        }
        
        print(f"正在上传文件: {file_name}...")
        print(f"文件大小: {file_size} 字节")
        print(f"请求参数: parent_type=bitable, parent_node={app_token}")
        
        upload_response = requests.post(upload_url, headers=headers, files=files)
        print(f"上传文件响应: {upload_response.text}")
        
        if upload_response.status_code != 200:
            print(f"上传文件失败: {upload_response.status_code}")
            return False
            
        upload_result = upload_response.json()
        if upload_result.get("code") != 0:
            print(f"上传文件失败: {upload_result.get('msg')}")
            return False
            
        # 获取文件token
        file_token = upload_result.get("data", {}).get("file_token")
        if not file_token:
            print("获取文件token失败")
            return False
            
        print(f"文件上传成功，file_token: {file_token}")
        
        # 2. 更新记录，添加附件
        update_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        # 构建附件数据，使用传入的附件字段名
        attachment_data = {
            "fields": {
                attachment_field_name: [{
                    "file_token": file_token,
                    "name": file_name,
                    "type": "pdf"
                }]
            }
        }
        
        print("正在更新记录添加附件...")
        print(f"更新记录请求数据: {json.dumps(attachment_data, ensure_ascii=False)}")
        update_response = requests.put(update_url, headers=headers, json=attachment_data)
        print(f"更新记录响应: {update_response.text}")
        
        if update_response.status_code == 200:
            update_result = update_response.json()
            if update_result.get("code") == 0:
                print("成功添加附件！")
                return True
            else:
                print(f"添加附件失败: {update_result.get('msg')}")
        else:
            print(f"请求失败: {update_response.text}")
        
        return False
            
    except Exception as e:
        print(f"上传附件异常: {str(e)}")
        import traceback
        print(f"详细异常信息:\n{traceback.format_exc()}")
        return False

def get_bitable_url(app_token):
    """获取多维表格的飞书文档地址"""
    token = get_tenant_access_token()
    if not token:
        print("获取 token 失败")
        return None
    
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers)
    print(f"获取多维表格信息响应: {response.text}")
    
    if response.status_code == 200:
        response_data = response.json()
        if response_data.get("code") == 0:
            app_data = response_data.get("data", {}).get("app", {})
            name = app_data.get("name")
            
            # 尝试获取URL的不同方式
            url = app_data.get("url")
            if not url:
                # 如果url字段为空，尝试其他可能的字段
                url = app_data.get("link") or app_data.get("share_url")
            
            # 如果仍然没有找到URL，则构造一个
            if not url:
                url = f"https://bitable.feishu.cn/app/{app_token}"
            
            print(f"\n多维表格信息:")
            print(f"名称: {name}")
            print(f"访问地址: {url}")
            return url
    
    print("获取多维表格地址失败")
    # 即使API没有返回URL，也构造一个可能的URL
    constructed_url = f"https://bitable.feishu.cn/app/{app_token}"
    print(f"构造的访问地址: {constructed_url}")
    return constructed_url

def upload_pdf_to_field_id(app_token, table_id, file_path, field_name="简历"):
    """直接将PDF上传到指定字段"""
    try:
        # 获取 tenant_access_token
        token = get_tenant_access_token()
        if not token:
            print("获取 token 失败")
            return False
        
        # 1. 直接上传文件
        upload_url = "https://open.feishu.cn/open-apis/drive/v1/medias/upload_all"
        
        file_name = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        # 读取文件内容
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # 准备上传请求
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        files = {
            'file': (file_name, file_content, 'application/pdf'),
            'parent_type': (None, 'bitable'),
            'parent_node': (None, app_token),
            'file_name': (None, file_name),
            'size': (None, str(file_size))
        }
        
        print(f"正在上传文件: {file_name}...")
        print(f"文件大小: {file_size} 字节")
        
        upload_response = requests.post(upload_url, headers=headers, files=files)
        print(f"上传文件响应: {upload_response.text}")
        
        if upload_response.status_code != 200:
            print(f"上传文件失败: {upload_response.status_code}")
            return False
            
        upload_result = upload_response.json()
        if upload_result.get("code") != 0:
            print(f"上传文件失败: {upload_result.get('msg')}")
            return False
            
        # 获取文件token
        file_token = upload_result.get("data", {}).get("file_token")
        if not file_token:
            print("获取文件token失败")
            return False
            
        print(f"文件上传成功，file_token: {file_token}")
        
        # 2. 创建新记录，使用字段名而不是字段ID
        create_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        # 使用字段名创建记录
        create_data = {
            "fields": {
                field_name: [{
                    "file_token": file_token,
                    "name": file_name,
                    "type": "pdf"
                }]
            }
        }
        
        print("正在创建新记录，仅包含PDF附件...")
        print(f"创建记录请求数据: {json.dumps(create_data, ensure_ascii=False)}")
        create_response = requests.post(create_url, headers=headers, json=create_data)
        print(f"创建记录响应: {create_response.text}")
        
        if create_response.status_code == 200:
            create_result = create_response.json()
            if create_result.get("code") == 0:
                print("成功创建记录并添加PDF附件！")
                record_id = create_result.get("data", {}).get("record", {}).get("record_id")
                print(f"新记录ID: {record_id}")
                
                # 获取并显示表格的URL
                table_url = get_bitable_url(app_token)
                print(f"可以通过以下地址访问表格: {table_url}")
                return True
            else:
                print(f"创建记录失败: {create_result.get('msg')}")
        else:
            print(f"请求失败: {create_response.status_code} {create_response.text}")
        
        return False
            
    except Exception as e:
        print(f"上传PDF到指定字段异常: {str(e)}")
        import traceback
        print(f"详细异常信息:\n{traceback.format_exc()}")
        return False

def get_existing_resumes(app_token, table_id, token):
    """获取表格中已有的简历文件信息，使用文件名和大小作为唯一标识"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    existing_files = {}
    page_token = None
    
    # 首先获取字段信息
    fields_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
    fields_response = requests.get(fields_url, headers=headers)
    print("\n=== 表格字段信息 ===")
    if fields_response.status_code == 200:
        fields_result = fields_response.json()
        if fields_result.get("code") == 0:
            fields = fields_result.get("data", {}).get("items", [])
            for field in fields:
                print(f"字段名: {field.get('field_name')}, 类型: {field.get('type')}")
    
    while True:
        params = {
            "page_size": 100
            # 移除 field_names 参数，获取所有字段数据
        }
        if page_token:
            params["page_token"] = page_token
            
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            result = response.json()
            if result.get("code") == 0:
                records = result.get("data", {}).get("items", [])
                for record in records:
                    fields = record.get("fields", {})
                    # 打印第一条记录的所有字段，帮助调试
                    if len(existing_files) == 0:
                        print("\n=== 第一条记录的字段信息 ===")
                        for field_name, field_value in fields.items():
                            print(f"字段名: {field_name}, 值: {field_value}")
                    
                    # 遍历所有字段，查找附件类型的字段
                    for field_name, field_value in fields.items():
                        if isinstance(field_value, list) and len(field_value) > 0:
                            # 检查是否是附件字段
                            first_item = field_value[0]
                            if isinstance(first_item, dict) and "file_token" in first_item:
                                for file in field_value:
                                    file_name = file.get("name", "")
                                    file_size = file.get("size", 0)
                                    file_token = file.get("file_token", "")
                                    
                                    # 使用文件名和大小的组合作为唯一标识
                                    file_key = f"{file_name}_{file_size}"
                                    existing_files[file_key] = {
                                        "name": file_name,
                                        "size": file_size,
                                        "file_token": file_token,
                                        "field_name": field_name  # 记录字段名
                                    }
                
                page_token = result.get("data", {}).get("page_token")
                if not page_token:
                    break
            else:
                print(f"获取记录失败: {result.get('msg')}")
                break
        else:
            print(f"请求失败: {response.status_code}")
            break
    
    print("\n=== 飞书表格中的简历信息 ===")
    print(f"总计找到 {len(existing_files)} 个文件")
    for file_key, info in existing_files.items():
        print(f"\n文件标识: {file_key}")
        print(f"- 字段名: {info['field_name']}")
        print(f"- 文件名: {info['name']}")
        print(f"- 文件大小: {info['size']} 字节")
        print(f"- 文件Token: {info['file_token']}")
    
    return existing_files

# 在主函数中修改判断逻辑
if __name__ == "__main__":
    print("=== 飞书表格文件上传工具 ===")
    
    # 从环境变量获取表格信息
    target_app_token = os.getenv('FEISHU_APP_TOKEN')
    target_table_id = os.getenv('FEISHU_TABLE_ID')
    
    # 指定CV文件夹路径
    cv_folder = os.getenv('DOWNLOAD_DIR')
    
    # 检查文件夹是否存在
    # 检查cv_folder是否为None
    if cv_folder is None:
        print("未设置CV文件夹路径")
    # 检查cv_folder是否为有效路径
    if cv_folder is None or not os.path.exists(cv_folder):
        print(f"文件夹不存在: {cv_folder}")
        print("请先创建CV文件夹并放入PDF文件")
    else:
        # 获取token
        token = get_tenant_access_token()
        if not token:
            print("获取 token 失败")
        else:
            # 获取已存在的文件信息
            print("\n正在获取表格中已有的简历文件...")
            existing_files = get_existing_resumes(target_app_token, target_table_id, token)
            
            # 获取文件夹中的所有PDF文件
            pdf_files = [f for f in os.listdir(cv_folder) if f.lower().endswith('.pdf')]
            
            if not pdf_files:
                print(f"在 {cv_folder} 中没有找到PDF文件")
            else:
                print(f"\n=== 本地PDF文件信息 ===")
                print(f"找到 {len(pdf_files)} 个PDF文件")
                
                uploaded_count = 0
                skipped_count = 0
                
                # 遍历所有PDF文件并上传
                for pdf_file in pdf_files:
                    pdf_path = os.path.join(cv_folder, pdf_file)
                    file_size = os.path.getsize(pdf_path)
                    file_key = f"{pdf_file}_{file_size}"
                    
                    print(f"\n准备上传: {pdf_file}")
                    print(f"- 文件路径: {pdf_path}")
                    print(f"- 文件大小: {file_size} 字节")
                    print(f"- 文件标识: {file_key}")
                    
                    # 检查是否存在并打印匹配信息
                    if file_key in existing_files:
                        existing_info = existing_files[file_key]
                        print("\n=== 发现重复文件 ===")
                        print("本地文件:")
                        print(f"- 文件名: {pdf_file}")
                        print(f"- 文件大小: {file_size} 字节")
                        print("\n飞书表格中的文件:")
                        print(f"- 文件名: {existing_info['name']}")
                        print(f"- 文件大小: {existing_info['size']} 字节")
                        skipped_count += 1
                        continue
                    
                    pdf_path = os.path.join(cv_folder, pdf_file)
                    if upload_pdf_to_field_id(target_app_token, target_table_id, pdf_path, "简历"):
                        uploaded_count += 1
                    time.sleep(1)
                
                print(f"\n批量上传完成:")
                print(f"- 上传成功: {uploaded_count} 个文件")
                print(f"- 跳过重复: {skipped_count} 个文件")
                print(f"- 总计处理: {len(pdf_files)} 个文件")
    
    print("=== 操作完成 ===")