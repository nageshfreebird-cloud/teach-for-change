$path = 'e:/antigravity/src/components/TeacherDashboard.tsx'
$text = [IO.File]::ReadAllText($path)

$selfClosingDiv = ([regex]::Matches($text, '(?i)<div[^>]*/>')).Count

Write-Host "Self-closing div: $selfClosingDiv"
