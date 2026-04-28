$output = "# SUPERPOWERS - COMPLETE CONTEXT`n"
$output += "Generated: $(Get-Date)`n`n"

$folders = @(
    ".claude-plugin",
    ".codex", 
    ".cursor-plugin",
    ".opencode",
    "agents",
    "commands",
    "docs",
    "hooks",
    "lib",
    "skills"
)

foreach ($folder in $folders) {
    $folderPath = ".\superpowers\$folder"
    
    if (Test-Path $folderPath) {
        $output += "`n`n===============================`n"
        $output += "# FOLDER: $folder`n"
        $output += "===============================`n"
        
        Get-ChildItem -Path $folderPath -Recurse -File | ForEach-Object {
            $relativePath = $_.FullName.Replace((Resolve-Path ".\superpowers").Path, "")
            $output += "`n--- FILE: $relativePath ---`n"
            
            try {
                $content = Get-Content $_.FullName -Raw -ErrorAction Stop
                $output += $content
            } catch {
                $output += "[Could not read file]"
            }
            
            $output += "`n"
        }
    }
}

$output | Out-File -FilePath ".\superpowers-complete.md" -Encoding utf8
Write-Host "Done! superpowers-complete.md created."
Write-Host "File size: $([math]::Round((Get-Item '.\superpowers-complete.md').Length / 1KB, 2)) KB"
