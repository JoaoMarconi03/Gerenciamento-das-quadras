# Ajudante local de impressao — recebe o texto do recibo via HTTP e manda os bytes
# RAW direto pro spooler da impressora (API WritePrinter do Windows), sem passar pela
# renderizacao de fonte do GDI. Isso evita o problema de linhas larguissimas/quebradas
# que acontece quando o texto e enviado via Out-Printer ou pelo navegador.

param(
  [string]$NomeImpressora = "GoldenSky POS-58",
  [int]$Porta = 9123
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
    [StructLayout(LayoutKind.Sequential)]
    public class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

    public static bool SendChunksToPrinter(string printerName, byte[][] chunks, int delayMs, out string erro)
    {
        // Um UNICO trabalho de impressao (Open/StartDoc/StartPage) para o
        // recibo inteiro — os pedacos sao varias chamadas de WritePrinter
        // dentro da MESMA sessao, com uma pequena pausa entre elas para dar
        // tempo da impressora drenar o buffer. Abrir/fechar um trabalho por
        // linha fazia a interface USB da impressora resetar a cada pedaco
        // (o barulho de "conectando/desconectando" durante a impressao).
        erro = "";
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Comanda MaPlayce";
        di.pDataType = "RAW";

        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
        {
            erro = "Nao foi possivel abrir a impressora (OpenPrinter falhou).";
            return false;
        }

        bool success = false;
        try
        {
            if (!StartDocPrinter(hPrinter, 1, di))
            {
                erro = "StartDocPrinter falhou.";
                return false;
            }
            try
            {
                if (!StartPagePrinter(hPrinter))
                {
                    erro = "StartPagePrinter falhou.";
                    return false;
                }
                try
                {
                    foreach (byte[] chunk in chunks)
                    {
                        int written;
                        bool ok = WritePrinter(hPrinter, chunk, chunk.Length, out written);
                        if (!ok || written != chunk.Length)
                        {
                            erro = "WritePrinter falhou no meio do recibo.";
                            return false;
                        }
                        System.Threading.Thread.Sleep(delayMs);
                    }
                    success = true;
                }
                finally
                {
                    EndPagePrinter(hPrinter);
                }
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
        return success;
    }
}
"@

function Send-Recibo([string]$texto, [string]$impressora) {
  $esc = [byte]27
  $gs  = [byte]29
  $init = [byte[]]@($esc, 64)              # ESC @  — inicializa a impressora
  $feed = [byte[]]@(10, 10, 10, 10)        # avanca papel antes do corte
  $cut  = [byte[]]@($gs, 86, 66, 0)        # GS V B 0 — corte parcial (se suportado)
  $enc  = [System.Text.Encoding]::GetEncoding("ISO-8859-1")

  $linhas = $texto -split "`n"
  $linhasPorBloco = 1
  $chunks = New-Object System.Collections.Generic.List[byte[]]
  $chunks.Add($init)
  for ($i = 0; $i -lt $linhas.Length; $i += $linhasPorBloco) {
    $fim = [Math]::Min($i + $linhasPorBloco, $linhas.Length) - 1
    $bloco = ($linhas[$i..$fim] -join "`r`n") + "`r`n"
    $chunks.Add($enc.GetBytes($bloco))
  }
  $chunks.Add($feed)
  $chunks.Add($cut)

  $erro = ""
  $ok = [RawPrinterHelper]::SendChunksToPrinter($impressora, $chunks.ToArray(), 1800, [ref]$erro)
  if (-not $ok -and $erro -eq "") {
    $erro = "WritePrinter falhou (codigo Win32: $([System.Runtime.InteropServices.Marshal]::GetLastWin32Error()))"
  }
  return @{ ok = $ok; erro = $erro }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Porta/")
$listener.Start()
Write-Host "Ajudante de impressao MaPlayce rodando em http://localhost:$Porta/"
Write-Host "Impressora alvo: $NomeImpressora"
Write-Host "Deixe esta janela aberta. Feche com Ctrl+C para parar."

while ($listener.IsListening) {
  $context = $null
  try {
    $context = $listener.GetContext()
  } catch {
    break
  }

  $request  = $context.Request
  $response = $context.Response
  $response.Headers.Add("Access-Control-Allow-Origin", "*")
  $response.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS")
  $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

  try {
    if ($request.HttpMethod -eq "OPTIONS") {
      $response.StatusCode = 204
    }
    elseif ($request.HttpMethod -eq "POST" -and $request.Url.AbsolutePath -eq "/imprimir") {
      $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
      $texto  = $reader.ReadToEnd()
      $reader.Close()

      $resultado = Send-Recibo -texto $texto -impressora $NomeImpressora

      if ($resultado.ok) {
        $response.StatusCode = 200
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("OK")
      } else {
        Write-Host "Erro ao imprimir: $($resultado.erro)"
        $response.StatusCode = 500
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("Erro: $($resultado.erro)")
      }
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    else {
      $response.StatusCode = 404
    }
  } catch {
    Write-Host "Erro ao imprimir: $($_.Exception.Message)"
    $response.StatusCode = 500
    $bytes = [System.Text.Encoding]::UTF8.GetBytes("Erro: $($_.Exception.Message)")
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } finally {
    $response.Close()
  }
}
