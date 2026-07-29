$path = 'e:/antigravity/src/components/TeacherDashboard.tsx'
$text = [IO.File]::ReadAllText($path)

$openDiv = ([regex]::Matches($text, '(?i)<div\b')).Count
$closeDiv = ([regex]::Matches($text, '(?i)</div\b')).Count

$openSpan = ([regex]::Matches($text, '(?i)<span\b')).Count
$closeSpan = ([regex]::Matches($text, '(?i)</span\b')).Count

$openMain = ([regex]::Matches($text, '(?i)<main\b')).Count
$closeMain = ([regex]::Matches($text, '(?i)</main\b')).Count

$openHeader = ([regex]::Matches($text, '(?i)<header\b')).Count
$closeHeader = ([regex]::Matches($text, '(?i)</header\b')).Count

$openTable = ([regex]::Matches($text, '(?i)<table\b')).Count
$closeTable = ([regex]::Matches($text, '(?i)</table\b')).Count

$openThead = ([regex]::Matches($text, '(?i)<thead\b')).Count
$closeThead = ([regex]::Matches($text, '(?i)</thead\b')).Count

$openTbody = ([regex]::Matches($text, '(?i)<tbody\b')).Count
$closeTbody = ([regex]::Matches($text, '(?i)</tbody\b')).Count

$openTr = ([regex]::Matches($text, '(?i)<tr\b')).Count
$closeTr = ([regex]::Matches($text, '(?i)</tr\b')).Count
$openMotionTr = ([regex]::Matches($text, '(?i)<motion.tr\b')).Count
$closeMotionTr = ([regex]::Matches($text, '(?i)</motion.tr\b')).Count

$openTd = ([regex]::Matches($text, '(?i)<td\b')).Count
$closeTd = ([regex]::Matches($text, '(?i)</td\b')).Count

$openTh = ([regex]::Matches($text, '(?i)<th\b')).Count
$closeTh = ([regex]::Matches($text, '(?i)</th\b')).Count

Write-Host "div: $openDiv / $closeDiv"
Write-Host "span: $openSpan / $closeSpan"
Write-Host "main: $openMain / $closeMain"
Write-Host "header: $openHeader / $closeHeader"
Write-Host "table: $openTable / $closeTable"
Write-Host "thead: $openThead / $closeThead"
Write-Host "tbody: $openTbody / $closeTbody"
Write-Host "tr: $openTr / $closeTr"
Write-Host "motion.tr: $openMotionTr / $closeMotionTr"
Write-Host "td: $openTd / $closeTd"
Write-Host "th: $openTh / $closeTh"
