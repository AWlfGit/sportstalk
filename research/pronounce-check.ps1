# Speaks each line of text with a Windows speech voice (to nowhere) and records the phonemes it
# would say, as ARPAbet codes. Used by research/pronounce-check.js; Windows only.
#   powershell -File research/pronounce-check.ps1 <in.json> <out.json> [voice]
# in.json: a JSON array of strings. out.json: a JSON array of strings of space-separated phonemes.
param([string]$In, [string]$Out, [string]$Voice = "Microsoft David Desktop")
Add-Type -AssemblyName System.Speech
# SAPI's American English phoneme ids
$map = @{10='AA';11='AE';12='AH';13='AO';14='AW';15='AX';16='AY';17='B';18='CH';19='D';20='DH';21='EH';22='ER';23='EY';24='F';25='G';26='H';27='IH';28='IY';29='JH';30='K';31='L';32='M';33='N';34='NG';35='OW';36='OY';37='P';38='R';39='S';40='SH';41='T';42='TH';43='UH';44='UW';45='V';46='W';47='Y';48='Z';49='ZH'}
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$global:ph = New-Object System.Collections.Generic.List[string]
$synth.add_PhonemeReached({ param($sender, $e) foreach ($ch in $e.Phoneme.ToCharArray()) { $c = [int]$ch; if ($map.ContainsKey($c)) { $global:ph.Add($map[$c]) } } })
$synth.SetOutputToNull()
try { $synth.SelectVoice($Voice) } catch { Write-Warning "Voice '$Voice' not found; using the default voice." }
$items = Get-Content -Raw -Encoding UTF8 $In | ConvertFrom-Json
$results = New-Object System.Collections.Generic.List[string]
foreach ($t in $items) {
  $global:ph.Clear()
  $synth.Speak([string]$t)
  $results.Add(($global:ph -join ' '))
}
$json = ConvertTo-Json -InputObject @($results) -Compress
[System.IO.File]::WriteAllText($Out, $json, (New-Object System.Text.UTF8Encoding($false)))
