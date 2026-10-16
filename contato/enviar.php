<?php
// Recebe o formulário de contato e envia por e-mail (hospedagem Hostinger, função mail()).
// As mensagens chegam em DESTINO.
const DESTINO = 'oi@thais.coffee';
const REMETENTE = 'oi@thais.coffee';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }
// campo isca: robôs preenchem, pessoas não veem
if (!empty($_POST['site'])) { echo '{"ok":true}'; exit; }

$nome  = trim(substr(strip_tags($_POST['nome'] ?? ''), 0, 120));
$email = trim($_POST['email'] ?? '');
$msg   = trim(substr(strip_tags($_POST['mensagem'] ?? ''), 0, 5000));

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strpbrk($email, "\r\n") !== false) {
  http_response_code(422); echo '{"ok":false,"erro":"email"}'; exit;
}
$nome = str_replace(["\r", "\n"], ' ', $nome);

$assunto = '=?UTF-8?B?' . base64_encode('thais.coffee: mensagem de ' . ($nome !== '' ? $nome : $email)) . '?=';
$corpo = "nome: " . ($nome !== '' ? $nome : '(não informado)') . "\ne-mail: $email\n\n" . ($msg !== '' ? $msg : '(sem mensagem)') . "\n";
$headers = "From: thais.coffee <" . REMETENTE . ">\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\n";

if (!mail(DESTINO, $assunto, $corpo, $headers)) {
  http_response_code(500); echo '{"ok":false}'; exit;
}
echo '{"ok":true}';
