$path = 'e:/antigravity/src/components/TeacherDashboard.tsx'
$text = [IO.File]::ReadAllText($path)

$openBrace = 0
$closeBrace = 0
$openParen = 0
$closeParen = 0
$openBracket = 0
$closeBracket = 0

foreach ($char in $text.ToCharArray()) {
    if ($char -eq '{') { $openBrace++ }
    if ($char -eq '}') { $closeBrace++ }
    if ($char -eq '(') { $openParen++ }
    if ($char -eq ')') { $closeParen++ }
    if ($char -eq '[') { $openBracket++ }
    if ($char -eq ']') { $closeBracket++ }
}

Write-Host "Braces: $openBrace open, $closeBrace close"
Write-Host "Parens: $openParen open, $closeParen close"
Write-Host "Brackets: $openBracket open, $closeBracket close"
