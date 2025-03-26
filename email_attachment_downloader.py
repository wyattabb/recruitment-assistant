#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import imaplib
import email
import os
import time
from datetime import datetime, timedelta
from email.header import decode_header
from tqdm import tqdm
import re

import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 邮箱配置
EMAIL_CONFIG = {
    'host': os.getenv('EMAIL_HOST'),
    'username': os.getenv('EMAIL_USERNAME'),
    'folder': 'INBOX',
    'save_dir': os.getenv('DOWNLOAD_DIR'),
    'days': 1,
    'keywords': [],
    'file_types': None,
    'sender_domain': '@service.bosszhipin.com'
}

# 从环境变量获取密码
def get_email_password():
    password = os.environ.get('EMAIL_PASSWORD')
    if not password:
        raise ValueError("请设置环境变量 EMAIL_PASSWORD")
    return password

def main():
    try:
        print("开始执行下载任务...")
        # 获取密码
        password = get_email_password()
        print("成功获取密码")
        
        download_attachments(
            EMAIL_CONFIG['host'],
            EMAIL_CONFIG['username'],
            password,
            EMAIL_CONFIG['folder'],
            EMAIL_CONFIG['save_dir'],
            EMAIL_CONFIG['days'],
            EMAIL_CONFIG['keywords'],
            EMAIL_CONFIG['file_types'],
            EMAIL_CONFIG.get('sender'),  # 保留原有的sender参数
            EMAIL_CONFIG.get('sender_domain')  # 添加新的sender_domain参数
        )
    except Exception as e:
        print(f"执行过程中出错: {e}")

def decode_str(s):
    """解码字符串"""
    if s:
        value, charset = decode_header(s)[0]
        if isinstance(value, bytes):
            try:
                return value.decode(charset or 'utf-8', errors='replace')
            except (UnicodeDecodeError, LookupError):
                return value.decode('utf-8', errors='replace')
        else:
            return value
    return ''

def clean_filename(filename):
    """清理文件名，移除不合法字符"""
    # 替换Windows和Unix系统中不允许的文件名字符
    return re.sub(r'[\\/*?:"<>|]', "_", filename)

def get_custom_folders(imap_client, parent_folder="我的文件夹"):
    """获取所有文件夹列表"""
    print(f"正在获取 {parent_folder} 下的所有文件夹...")
    sub_folders = []
    
    try:
        # 获取所有文件夹并保留原始字节数据
        status, folders = imap_client.list()
        if status == 'OK':
            print("找到服务器上的所有文件夹:")
            for folder_bytes in folders:
                try:
                    # 分离目录标识符和路径
                    _, _, folder_path = folder_bytes.partition(b' "/" ')
                    raw_path = folder_path.decode('utf-7').strip('"')
                    
                    # 转换中文路径为UTF-7编码
                    encoded_path = raw_path.encode('utf-7').decode('ascii')
                    print(f"  - 原始字节: {folder_bytes} => 解码路径: {raw_path} => 编码路径: {encoded_path}")
                    
                    # 只添加可选择的子文件夹
                    if "\\NoSelect" not in folder_bytes.decode('utf-7'):
                        sub_folders.append(encoded_path)
                except Exception as e:
                    print(f"  处理文件夹时出错: {e}")
                    continue
    except Exception as e:
        print(f"获取文件夹列表失败: {e}")
    
    # 添加保底路径
    fallback_paths = [
        '&UXZO1mWHTvZZOQ-/&NEm3yw-',  # 编码后的内推路径
        'INBOX'                      # 保底收件箱
    ]
    sub_folders.extend(fallback_paths)
    
    return sub_folders

def download_attachments(host, username, password, folder, save_dir, days=None, keywords=None, file_types=None, sender=None, sender_domain=None):
    mail = None
    try:
        # 连接到IMAP服务器
        print(f"正在连接到服务器: {host}")
        mail = imaplib.IMAP4_SSL(host)
        
        print(f"正在尝试登录: {username}")
        mail.login(username, password)
        print(f"成功登录到 {username}")
        
        # 添加延迟，等待服务器就绪
        time.sleep(2)
        
        # 检查连接状态
        print("检查连接状态...")
        try:
            mail.noop()
        except Exception as e:
            print(f"连接状态检查失败: {e}")
            return
            
        # 直接选择收件箱
        print("选择收件箱...")
        status, messages = mail.select('INBOX')
        if status != 'OK':
            print("无法选择收件箱，退出")
            return
        else:
            print("成功选择收件箱")
                
        # 构建搜索条件：指定发件人或发件人域名
        if sender:
            search_criteria = f'(FROM "{sender}")'
        elif sender_domain:
            # IMAP不支持直接的模糊匹配，我们先获取所有邮件，然后在代码中过滤
            search_criteria = '(ALL)'
        else:
            # 如果没有指定发件人，则使用日期条件
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%d-%b-%Y")
            search_criteria = f'(SINCE "{yesterday}")'
            
        print(f"搜索条件: {search_criteria}")
        
        # 搜索邮件
        print("搜索邮件中...")
        status, data = mail.search(None, search_criteria)
        
        if status != 'OK':
            print("搜索邮件失败")
            return
        
        # 创建保存目录
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
        
        # 获取邮件ID列表
        mail_ids = data[0].split()
        
        if not mail_ids:
            print("没有找到符合条件的邮件")
            return
        
        # 如果需要过滤发件人域名，我们需要先检查每封邮件
        if sender_domain:
            print(f"正在过滤发件人域名: {sender_domain}...")
            filtered_ids = []
            for num in tqdm(mail_ids, desc="过滤邮件"):
                status, data = mail.fetch(num, '(BODY[HEADER.FIELDS (FROM)])')
                if status != 'OK':
                    continue
                
                # 检查data[0]是否为None或空
                if not data or not data[0]:
                    print("警告: 无法获取邮件头信息")
                    continue
                from_header = data[0][1].decode('utf-8') if data[0][1] else ''
                # 提取邮箱地址
                email_match = re.search(r'[\w\.-]+@[\w\.-]+', from_header)
                if email_match and email_match.group().endswith(sender_domain):
                    filtered_ids.append(num)
            
            mail_ids = filtered_ids
            print(f"过滤后剩余 {len(mail_ids)} 封邮件")
            
            if not mail_ids:
                print("没有找到符合条件的邮件")
                return
                
        # 移除10封邮件的限制，处理所有符合条件的邮件
        print(f"找到 {len(mail_ids)} 封邮件，开始下载附件...")
        
        # 创建已下载文件记录集合
        downloaded_files = set()
        
        # 检查目录中已有的文件
        for existing_file in os.listdir(save_dir):
            if existing_file.lower().endswith('.pdf'):
                downloaded_files.add(existing_file)
        
        print(f"目录中已有 {len(downloaded_files)} 个PDF文件")
        
        # 下载附件
        attachment_count = 0
        skipped_count = 0
        for num in tqdm(mail_ids, desc="处理邮件"):
            status, data = mail.fetch(num, '(RFC822)')
            if status != 'OK':
                continue
                
            msg = email.message_from_bytes(data[0][1])
            subject = decode_str(msg.get('Subject', '无主题'))
            from_addr = decode_str(msg.get('From', '未知发件人'))
            
            print(f"处理邮件: {subject} (来自: {from_addr})")
            
            # 遍历邮件部分
            for part in msg.walk():
                if part.get_content_maintype() == 'multipart':
                    continue
                
                # 检查是否为附件
                filename = part.get_filename()
                if filename:
                    filename = decode_str(filename)
                    print(f"发现附件: {filename}")
                    
                    # 只下载PDF文件
                    if not filename.lower().endswith('.pdf'):
                        print(f"跳过非PDF文件: {filename}")
                        continue
                    
                    # 直接保存到CV目录，不创建子文件夹
                    # 使用邮件主题作为文件名前缀，避免文件名冲突
                    clean_subject = clean_filename(subject)
                    new_filename = f"{clean_subject[:30]}_{clean_filename(filename)}"
                    filepath = os.path.join(save_dir, new_filename)
                    
                    # 检查文件是否已存在
                    if new_filename in downloaded_files:
                        print(f"跳过已存在的文件: {new_filename}")
                        skipped_count += 1
                        continue
                    
                    # 获取附件内容并确保是字节类型
                    payload = part.get_payload(decode=True)
                    if payload is None:
                        print(f"警告: 无法获取附件内容: {filename}")
                        continue
                    
                    # 确保payload是字节类型
                    if not isinstance(payload, bytes):
                        try:
                            payload = bytes(payload)
                        except (TypeError, ValueError):
                            print(f"警告: 无法将附件内容转换为字节类型: {filename}")
                            continue
                        
                    try:
                        with open(filepath, 'wb') as f:
                            f.write(payload)  # 现在payload一定是字节类型
                        attachment_count += 1
                        downloaded_files.add(new_filename)
                        print(f"已保存附件: {filename} 到 {filepath}")
                    except IOError as e:
                        print(f"保存文件时出错: {e}")
        
        print(f"完成！共下载了 {attachment_count} 个附件，跳过了 {skipped_count} 个重复文件")
        
    except Exception as e:
        print(f"处理过程中出错: {e}")
        return
    finally:
        if mail:
            try:
                mail.close()
                mail.logout()
            except Exception as e:
                print(f"关闭邮箱连接时出错: {e}")

if __name__ == '__main__':
    main()