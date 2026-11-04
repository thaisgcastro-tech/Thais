<?php
// Reações (coração e lâmpada) e comentários dos cases e textos de opinião.
// GET  /reacoes.php?slug=x                       → contagens + comentários da página
// POST /reacoes.php {acao:"reagir", slug, tipo:"curtir"|"insight", ligado:bool}
// POST /reacoes.php {acao:"comentar", slug, nome, linkedin, texto, site}
// GET/POST /reacoes.php?apagar=ID&slug=x&chave=K → link do e-mail para apagar um comentário
// Os dados ficam fora da pasta do site (não são apagados pelo deploy nem acessíveis pela web).
const DESTINO = 'oi@thais.coffee';
const REMETENTE = 'oi@thais.coffee';
const SITE = 'https://thais.coffee';
const PAGINAS = [
  'transparencia'  => ['case: transparência como regra de produto', '/cases/transparencia/'],
  'portfolio-ia'   => ['case: este portfólio, feito com IA', '/cases/este-portfolio/'],
  'refin'          => ['case: refinanciamento em dia', '/cases/refinanciamento-em-dia/'],
  'lembrete'       => ['case: lembrete de pagamento', '/cases/lembrete-de-pagamento/'],
  'ia'             => ['opinião: IA não faz bons designers', '/opiniao/ia/'],
  'roadmap'        => ['opinião: ninguém me chamou pra mesa do roadmap', '/opiniao/roadmap/'],
  'conteudo-dados' => ['opinião: content designer também abre planilha', '/opiniao/conteudo-e-dados/'],
];

function pasta() {
  $fora = dirname(__DIR__) . '/thais-reacoes';
  if (@is_dir($fora) || @mkdir($fora, 0750, true)) return $fora;
  $dentro = __DIR__ . '/_reacoes';
  if (!@is_dir($dentro)) { @mkdir($dentro, 0750, true); }
  if (!file_exists("$dentro/.htaccess")) { @file_put_contents("$dentro/.htaccess", "Require all denied\nDeny from all\n"); }
  return $dentro;
}
function sal($dir) {
  $f = "$dir/sal.txt";
  if (!file_exists($f)) { @file_put_contents($f, bin2hex(random_bytes(16)), LOCK_EX); }
  return trim((string)@file_get_contents($f));
}
function quem($dir) {
  return hash('sha256', sal($dir) . '|' . ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
}
function sair($codigo, $dados) { http_response_code($codigo); echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

// abre o arquivo da página com trava; $fn recebe os dados e devolve [dados novos ou null, resposta]
function comDados($dir, $slug, $fn) {
  $h = fopen("$dir/$slug.json", 'c+');
  if (!$h) sair(500, ['ok' => false]);
  flock($h, LOCK_EX);
  $txt = stream_get_contents($h);
  $d = json_decode($txt ?: '{}', true) ?: [];
  $d += ['curtir' => [], 'insight' => [], 'comentarios' => []];
  [$novo, $resp] = $fn($d);
  if ($novo !== null) {
    ftruncate($h, 0); rewind($h);
    fwrite($h, json_encode($novo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($h);
  }
  flock($h, LOCK_UN); fclose($h);
  return $resp;
}
function publico($d, $eu) {
  return [
    'likes' => count($d['curtir']), 'liked' => in_array($eu, $d['curtir'], true),
    'insights' => count($d['insight']), 'insighted' => in_array($eu, $d['insight'], true),
    'comments' => array_map(fn($c) => ['id' => $c['id'], 'nome' => $c['nome'], 'linkedin' => $c['linkedin'], 'texto' => $c['texto'], 'data' => $c['data']], $d['comentarios']),
  ];
}
function linkedin($v) {
  $s = trim((string)$v);
  if (!preg_match('~^(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/(in|pub)/([^\s/?#"<>]{2,100})~i', $s, $m)) return null;
  return 'https://www.linkedin.com/' . strtolower($m[1]) . '/' . $m[2];
}
function limpa($v, $max) {
  $s = trim(strip_tags((string)$v));
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
  return mb_substr($s, 0, $max);
}
function paginaApagar($titulo, $texto, $form = '') {
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . htmlspecialchars($titulo) . '</title>'
    . '<style>body{margin:0;background:#292929;color:#f2f2f5;font:16px/1.6 "Roboto Mono",monospace;text-transform:lowercase}main{max-width:640px;margin:64px auto;padding:0 24px}button{min-height:48px;padding:0 24px;background:#1847e3;color:#f2f2f5;border:1px solid #f2f2f5;box-shadow:4px 4px 0 #f2f2f5;font:500 16px "Roboto Mono",monospace;cursor:pointer}blockquote{margin:24px 0;padding:16px;border:2px solid #f2f2f5;text-transform:none;white-space:pre-line}a{color:#f2f2f5}</style></head><body><main>'
    . '<h1>' . htmlspecialchars($titulo) . '</h1>' . $texto . $form . '</main></body></html>';
  exit;
}

$dir = pasta();

// ---------- apagar comentário (link do e-mail): GET mostra a confirmação, POST apaga
if (isset($_GET['apagar'])) {
  $slug = (string)($_GET['slug'] ?? ''); $id = (string)$_GET['apagar']; $chave = (string)($_GET['chave'] ?? '');
  if (!isset(PAGINAS[$slug]) || !preg_match('/^[a-f0-9]{12}$/', $id) || !preg_match('/^[a-f0-9]{32}$/', $chave)) paginaApagar('link inválido', '<p>esse link não funciona mais.</p>');
  $acao = $_SERVER['REQUEST_METHOD'] === 'POST';
  $r = comDados($dir, $slug, function ($d) use ($id, $chave, $acao) {
    foreach ($d['comentarios'] as $i => $c) {
      if ($c['id'] === $id && hash_equals($c['chave'], $chave)) {
        if (!$acao) return [null, ['achou' => $c]];
        array_splice($d['comentarios'], $i, 1);
        return [$d, ['apagou' => true]];
      }
    }
    return [null, []];
  });
  if (!empty($r['apagou'])) paginaApagar('comentário apagado', '<p>pronto, ele saiu da página.</p><p><a href="' . SITE . PAGINAS[$slug][1] . '">ver a página</a></p>');
  if (empty($r['achou'])) paginaApagar('não achei esse comentário', '<p>talvez ele já tenha sido apagado.</p>');
  $c = $r['achou'];
  paginaApagar('apagar comentário?', '<p>de ' . htmlspecialchars($c['nome']) . ' em ' . htmlspecialchars(PAGINAS[$slug][0]) . ':</p><blockquote>' . htmlspecialchars($c['texto']) . '</blockquote>',
    '<form method="post"><button type="submit">apagar</button></form>');
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$eu = quem($dir);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $slug = (string)($_GET['slug'] ?? '');
  if (!isset(PAGINAS[$slug])) sair(404, ['ok' => false]);
  sair(200, comDados($dir, $slug, fn($d) => [null, publico($d, $eu)]));
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') sair(405, ['ok' => false]);

$origem = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origem !== '' && !preg_match('~^(https://(www\.)?thais\.coffee|http://(localhost|127\.0\.0\.1)(:\d+)?)$~', $origem)) sair(403, ['ok' => false]);

$in = json_decode(file_get_contents('php://input', false, null, 0, 20000) ?: '', true);
if (!is_array($in)) sair(400, ['ok' => false]);
$slug = (string)($in['slug'] ?? '');
if (!isset(PAGINAS[$slug])) sair(404, ['ok' => false]);

// ---------- coração e lâmpada (uma reação de cada tipo por pessoa)
if (($in['acao'] ?? '') === 'reagir') {
  $tipo = ($in['tipo'] ?? '') === 'insight' ? 'insight' : 'curtir';
  $ligado = !empty($in['ligado']);
  sair(200, comDados($dir, $slug, function ($d) use ($tipo, $ligado, $eu) {
    $d[$tipo] = array_values(array_filter($d[$tipo], fn($x) => $x !== $eu));
    if ($ligado) $d[$tipo][] = $eu;
    return [$d, publico($d, $eu)];
  }));
}

// ---------- comentário: entra na hora e avisa por e-mail com link para apagar
if (($in['acao'] ?? '') === 'comentar') {
  if (!empty($in['site'])) sair(200, ['ok' => true]); // campo isca: robôs preenchem, pessoas não veem
  $nome = str_replace(["\r", "\n"], ' ', limpa($in['nome'] ?? '', 80));
  $li = linkedin($in['linkedin'] ?? '');
  $texto = limpa($in['texto'] ?? '', 1500);
  if ($nome === '' || !$li || $texto === '') sair(422, ['ok' => false]);

  // no máximo 5 comentários a cada 10 minutos por pessoa, somando todas as páginas
  $lim = "$dir/limite.json";
  $h = fopen($lim, 'c+'); flock($h, LOCK_EX);
  $l = json_decode(stream_get_contents($h) ?: '{}', true) ?: [];
  $agora = time();
  foreach ($l as $k => $ts) { $l[$k] = array_values(array_filter($ts, fn($t) => $t > $agora - 600)); if (!$l[$k]) unset($l[$k]); }
  $muitos = count($l[$eu] ?? []) >= 5;
  if (!$muitos) $l[$eu][] = $agora;
  ftruncate($h, 0); rewind($h); fwrite($h, json_encode($l)); flock($h, LOCK_UN); fclose($h);
  if ($muitos) sair(429, ['ok' => false]);

  $c = ['id' => bin2hex(random_bytes(6)), 'chave' => bin2hex(random_bytes(16)), 'nome' => $nome, 'linkedin' => $li, 'texto' => $texto, 'data' => gmdate('c')];
  comDados($dir, $slug, function ($d) use ($c) { $d['comentarios'][] = $c; return [$d, null]; });

  $pag = PAGINAS[$slug];
  $apagar = SITE . '/reacoes.php?apagar=' . $c['id'] . '&slug=' . $slug . '&chave=' . $c['chave'];
  $assunto = '=?UTF-8?B?' . base64_encode('thais.coffee: comentário de ' . $nome) . '?=';
  $corpo = "novo comentário em {$pag[0]}\n" . SITE . $pag[1] . "\n\nnome: $nome\nlinkedin: $li\n\n$texto\n\n---\nfoi spam ou quer tirar do ar? apague aqui:\n$apagar\n";
  $headers = "From: thais.coffee <" . REMETENTE . ">\r\nContent-Type: text/plain; charset=UTF-8\r\n";
  @mail(DESTINO, $assunto, $corpo, $headers);

  sair(200, ['ok' => true, 'comentario' => ['id' => $c['id'], 'nome' => $c['nome'], 'linkedin' => $c['linkedin'], 'texto' => $c['texto'], 'data' => $c['data']]]);
}

sair(400, ['ok' => false]);
