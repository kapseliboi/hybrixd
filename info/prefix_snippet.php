class Sign{

public function convertSignature($signature)
{
$ecdsa_struct['original'] = $signature;
$ecdsa_struct['totallen'] = strlen($signature);
$ecdsa_struct['sigstart'] = substr($signature, 0, 2);
$signature = substr($signature, 2);
$ecdsa_struct['siglen'] = substr($signature, 0, 2);
$signature = substr($signature, 2);
$ecdsa_struct['rtype'] = substr($signature, 0, 2);
$signature = substr($signature, 2);
$ecdsa_struct['rlen'] = substr($signature, 0, 2);
$ecdsa_struct['roffset'] = ($ecdsa_struct['rlen'] == '21') ? 2 : 0;
$signature = substr($signature, 2);
$ecdsa_struct['r'] = substr($signature, $ecdsa_struct['roffset'], 64);
$signature = substr($signature, $ecdsa_struct['roffset'] + 64);
$ecdsa_struct['stype'] = substr($signature, 0, 2);
$signature = substr($signature, 2);
$ecdsa_struct['slen'] = substr($signature, 0, 2);
print_r($ecdsa_struct);
}
}
