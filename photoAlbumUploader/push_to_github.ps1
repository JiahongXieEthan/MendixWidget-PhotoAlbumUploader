# GitHub 推送脚本
# 使用方法：在 PowerShell 中执行 .\push_to_github.ps1

cd D:\Mendix\Projects\StyleForge-main\myPluggableWidgets\photoAlbumUploader

Write-Host "正在检查 Git 状态..." -ForegroundColor Yellow
git status

Write-Host "`n正在推送到 GitHub..." -ForegroundColor Yellow
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 推送成功！" -ForegroundColor Green
} else {
    Write-Host "`n❌ 推送失败，请检查网络连接或稍后重试" -ForegroundColor Red
}

