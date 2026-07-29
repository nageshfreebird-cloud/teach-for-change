$path = 'e:/antigravity/src/components/TeacherDashboard.tsx'
$text = [IO.File]::ReadAllText($path)

$singleQuotes = 0
$doubleQuotes = 0
$backticks = 0

foreach ($char in $text.ToCharArray()) {
    if ($char -eq "'") { $singleQuotes++ }
    if ($char -eq '"') { $doubleQuotes++ }
    if ($char -eq '`') { $backticks++ }
}

Write-Host "Quotes: Single: $singleQuotes, Double: $doubleQuotes, Backticks: $backticks"
