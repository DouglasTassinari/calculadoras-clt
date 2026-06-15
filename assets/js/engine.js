/* =====================================================================
   RÉGUA CLT — Engine de Cálculo 2026
   Extraído e corrigido do motor original
   ===================================================================== */

const r2 = (x) => Math.round((x + 1e-9) * 100) / 100;
const nz = (x) => (isFinite(x) && !isNaN(x) ? x : 0);

// Constantes 2026 — Portaria Interministerial MPS/MF nº 13/2026 e Decreto nº 12.797/2025
const SALARIO_MINIMO = 1621.00;
const INSS_TETO = 8475.55;
const MEI_DAS = 81.05; // 5% do salário mínimo 2026

const INSS_TAB = [
  { ate: 1621.00, aliq: 0.075, deduz: 0 },
  { ate: 2902.84, aliq: 0.09,  deduz: 24.32 },
  { ate: 4354.27, aliq: 0.12,  deduz: 111.40 },
  { ate: 8475.55, aliq: 0.14,  deduz: 198.49 },
];
const IRRF_TAB = [
  { ate: 2428.80,  aliq: 0,     deduz: 0 },
  { ate: 2826.65,  aliq: 0.075, deduz: 182.16 },
  { ate: 3751.05,  aliq: 0.15,  deduz: 394.16 },
  { ate: 4664.68,  aliq: 0.225, deduz: 675.49 },
  { ate: Infinity, aliq: 0.275, deduz: 908.73 },
];
const IRRF_DEPENDENTE = 189.59;
const IRRF_SIMPLIFICADO = 607.20;
// 2026: isenção efetiva até R$ 5.000; redutor gradual de R$ 5.000 a R$ 7.350
const IRRF_ISENTAO = 5000.00;
const IRRF_TETO_REDUTOR = 7350.00;

// Tabela anual IR (declaração 2027, ano-calendário 2026)
const IRRF_ANUAL_TAB = [
  { ate: 28467.20,  aliq: 0,     deduz: 0 },
  { ate: 33919.80,  aliq: 0.075, deduz: 2135.04 },
  { ate: 45012.60,  aliq: 0.15,  deduz: 4679.03 },
  { ate: 55976.16,  aliq: 0.225, deduz: 8054.97 },
  { ate: Infinity,  aliq: 0.275, deduz: 10853.78 },
];
const IRRF_DEP_ANUAL = 2275.08;
const IRRF_SIMPL_PCT = 0.20;
const IRRF_SIMPL_TETO = 17640.00;

// Salário-família
const SF_TETO = 1621.00;
const SF_VALOR = 67.54;

function calcINSS(base){
  const b = Math.min(nz(base), INSS_TETO);
  if (b <= 0) return { valor:0, aliqEfetiva:0, faixa:null, baseUsada:0, teto:false };
  let faixa = INSS_TAB[INSS_TAB.length-1];
  for (const f of INSS_TAB){ if (b <= f.ate){ faixa = f; break; } }
  const valor = r2(b*faixa.aliq - faixa.deduz);
  return { valor, aliqEfetiva:r2((valor/b)*100), faixa, baseUsada:b, teto:nz(base)>INSS_TETO };
}

function irrfTabela(base){
  const b = Math.max(0, nz(base));
  for (const f of IRRF_TAB) if (b <= f.ate) return { imposto:r2(Math.max(b*f.aliq - f.deduz,0)), aliq:f.aliq };
  return { imposto:0, aliq:0 };
}

function calcRedutor(rend, imp){
  // 2026: até R$ 5.000 isento; R$ 5.000,01–R$ 7.350 redução gradual (fórmula Lei 14.848/2024)
  if (rend <= IRRF_ISENTAO) return imp; // isenção total
  if (rend >= IRRF_TETO_REDUTOR) return 0; // sem redutor acima de R$ 7.350
  const redutor = r2(Math.max(978.62 - 0.133145 * rend, 0));
  return r2(Math.min(redutor, imp));
}

function calcIRRF(rend, inss, deps=0, pensao=0){
  rend = nz(rend);
  const dedLegais = nz(inss) + nz(deps)*IRRF_DEPENDENTE + nz(pensao);
  const baseLegal = rend - dedLegais;
  const baseSimpl = rend - IRRF_SIMPLIFICADO;
  const usouSimplificado = baseSimpl < baseLegal;
  const base = Math.max(0, Math.min(baseLegal, baseSimpl));
  const t = irrfTabela(base);
  const redutor = r2(calcRedutor(rend, t.imposto));
  return {
    base:r2(base), aliq:t.aliq, impostoApurado:t.imposto, redutor,
    valor:r2(Math.max(t.imposto - redutor, 0)),
    usouSimplificado, deducaoUsada:r2(usouSimplificado?IRRF_SIMPLIFICADO:dedLegais),
    deps:nz(deps),
  };
}

function salarioLiquido({ bruto, deps=0, outrosDescontos=0, pensao=0 }){
  bruto = nz(bruto);
  const inss = calcINSS(bruto);
  const irrf = calcIRRF(bruto, inss.valor, deps, pensao);
  const liquido = r2(bruto - inss.valor - irrf.valor - nz(outrosDescontos) - nz(pensao));
  return { bruto:r2(bruto), inss, irrf, outrosDescontos:r2(nz(outrosDescontos)), pensao:r2(nz(pensao)), liquido };
}

function decimoTerceiro({ bruto, meses=12, deps=0 }){
  bruto = nz(bruto); meses = Math.max(0, Math.min(12, Math.round(nz(meses))));
  const bruto13 = r2((bruto/12)*meses);
  const inss = calcINSS(bruto13);
  const irrf = calcIRRF(bruto13, inss.valor, deps);
  const primeira = r2(bruto13/2);
  const liquidoTotal = r2(bruto13 - inss.valor - irrf.valor);
  const segunda = r2(liquidoTotal - primeira);
  return { bruto13, meses, inss, irrf, primeira, segunda, liquidoTotal };
}

function ferias({ bruto, dias=30, venderDias=0, deps=0 }){
  bruto = nz(bruto);
  dias = Math.max(0, Math.min(30, Math.round(nz(dias))));
  venderDias = Math.max(0, Math.min(10, Math.round(nz(venderDias))));
  const diasGozo = Math.max(0, dias - venderDias);
  const valorGozo = r2((bruto/30)*diasGozo);
  const tercoGozo = r2(valorGozo/3);
  const abono = r2((bruto/30)*venderDias);
  const tercoAbono = r2(abono/3);
  const baseTributavel = r2(valorGozo + tercoGozo);
  const inss = calcINSS(baseTributavel);
  const irrf = calcIRRF(baseTributavel, inss.valor, deps);
  const liquido = r2(valorGozo + tercoGozo + abono + tercoAbono - inss.valor - irrf.valor);
  return { bruto:r2(bruto), dias, diasGozo, venderDias, valorGozo, tercoGozo, abono, tercoAbono, baseTributavel, inss, irrf, liquido };
}

function horasExtras({ bruto, jornadaMensal=220, qtdHoras=0, percentual=50, dsr=false, diasUteis=25, domingosFeriados=5 }){
  bruto = nz(bruto);
  jornadaMensal = nz(jornadaMensal) || 220;
  const valorHora = r2(bruto/jornadaMensal);
  const valorHoraExtra = r2(valorHora*(1+nz(percentual)/100));
  const totalHE = r2(valorHoraExtra*nz(qtdHoras));
  let valorDSR = 0;
  if (dsr && nz(diasUteis)>0) valorDSR = r2((totalHE/nz(diasUteis))*nz(domingosFeriados));
  const total = r2(totalHE + valorDSR);
  return { valorHora, valorHoraExtra, qtdHoras:nz(qtdHoras), percentual:nz(percentual), totalHE, valorDSR, dsr, total };
}

function parseDate(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); if(!y||!m||!d) return null; return new Date(y,m-1,d); }
function diasNoMes(ano,mes){ return new Date(ano,mes+1,0).getDate(); }
function addDays(date,n){ const d=new Date(date); d.setDate(d.getDate()+n); return d; }

function contarAvos(start,end){
  if(!start||!end||end<start) return 0;
  let avos=0, ano=start.getFullYear(), mes=start.getMonth();
  while(ano<end.getFullYear() || (ano===end.getFullYear() && mes<=end.getMonth())){
    const pd=new Date(ano,mes,1), ud=new Date(ano,mes,diasNoMes(ano,mes));
    const ini=start>pd?start:pd, fim=end<ud?end:ud;
    const dt=Math.floor((fim-ini)/86400000)+1;
    if(dt>=15) avos++;
    mes++; if(mes>11){mes=0; ano++;}
  }
  return Math.min(avos,12);
}

function anosCompletos(adm,desl){
  let anos=desl.getFullYear()-adm.getFullYear();
  const m=desl.getMonth()-adm.getMonth();
  if(m<0||(m===0&&desl.getDate()<adm.getDate())) anos--;
  return Math.max(0,anos);
}

function ultimoAniversario(adm,data){
  let a=new Date(data.getFullYear(),adm.getMonth(),adm.getDate());
  if(a>data) a=new Date(data.getFullYear()-1,adm.getMonth(),adm.getDate());
  return a;
}

function rescisao({ bruto, admissao, desligamento, motivo, aviso='indenizado', temFeriasVencidas=false, diasFeriasVencidas=30, saldoFGTS=null, deps=0 }){
  bruto = nz(bruto);
  const adm=parseDate(admissao), desl=parseDate(desligamento);
  if(!adm||!desl||desl<adm) return { erro:'Verifique as datas: o desligamento deve ser posterior à admissão.' };
  const anos=anosCompletos(adm,desl);
  const totalMeses=Math.max(1,Math.round((desl-adm)/86400000/30.44));
  const diasAviso=Math.min(30+3*anos,90);
  const projeta=(motivo==='sem_justa_causa'&&aviso==='indenizado')||motivo==='acordo';
  const fimProjecao=projeta?addDays(desl,diasAviso):desl;
  const diasTrabalhadosMes=desl.getDate();
  const saldoSalario=r2((bruto/30)*diasTrabalhadosMes);
  const inicioAno=new Date(desl.getFullYear(),0,1);
  const start13=adm>inicioAno?adm:inicioAno;
  const avos13=contarAvos(start13,fimProjecao);
  const startFerias=ultimoAniversario(adm,desl);
  const avosFerias=contarAvos(startFerias,fimProjecao);
  const devido={
    sem_justa_causa:{ saldo:true, aviso:'indenizado', d13:true, feriasProp:true, feriasVenc:true, multaPct:0.40, saquePct:1.00, seguro:true },
    pedido:         { saldo:true, aviso:'desconto',   d13:true, feriasProp:true, feriasVenc:true, multaPct:0,    saquePct:0,    seguro:false },
    justa_causa:    { saldo:true, aviso:'nenhum',     d13:false,feriasProp:false,feriasVenc:true, multaPct:0,    saquePct:0,    seguro:false },
    acordo:         { saldo:true, aviso:'metade',     d13:true, feriasProp:true, feriasVenc:true, multaPct:0.20, saquePct:0.80, seguro:false },
  }[motivo];
  let avisoValor=0, avisoDesconto=0;
  const avisoBase=r2((bruto/30)*diasAviso);
  if(motivo==='acordo') avisoValor=r2(avisoBase/2);
  else if(aviso==='nao_cumprido') avisoDesconto=r2((bruto/30)*30);
  else if(motivo==='sem_justa_causa' && aviso==='indenizado') avisoValor=avisoBase;
  const d13Bruto=devido.d13?r2((bruto/12)*avos13):0;
  const inss13=calcINSS(d13Bruto);
  const irrf13=d13Bruto>0?calcIRRF(d13Bruto,inss13.valor,deps):{valor:0,base:0,aliq:0,impostoApurado:0,redutor:0,usouSimplificado:false,deducaoUsada:0};
  const feriasPropBase=devido.feriasProp?r2((bruto/12)*avosFerias):0;
  const feriasPropTerco=r2(feriasPropBase/3);
  const fv=temFeriasVencidas&&devido.feriasVenc;
  const feriasVencBase=fv?r2((bruto/30)*Math.max(0,Math.min(30,Math.round(nz(diasFeriasVencidas))))):0;
  const feriasVencTerco=r2(feriasVencBase/3);
  const inssSaldo=calcINSS(saldoSalario);
  const irrfSaldo=calcIRRF(saldoSalario,inssSaldo.valor,deps);
  const fgtsBase=saldoFGTS!=null?r2(nz(saldoFGTS)):r2(0.08*bruto*totalMeses);
  const fgtsEstimado=saldoFGTS==null;
  const multaFGTS=r2(fgtsBase*devido.multaPct);
  const fgtsSaque=r2(fgtsBase*devido.saquePct);
  const proventos=[];
  if(devido.saldo) proventos.push({nome:`Saldo de salário (${diasTrabalhadosMes} ${diasTrabalhadosMes===1?'dia':'dias'})`, valor:saldoSalario});
  if(avisoValor>0) proventos.push({nome:`Aviso prévio indenizado (${diasAviso} dias${devido.aviso==='metade'?', 50%':''})`, valor:avisoValor});
  if(d13Bruto>0) proventos.push({nome:`13º proporcional (${avos13}/12)`, valor:d13Bruto});
  if(feriasPropBase>0) proventos.push({nome:`Férias proporcionais (${avosFerias}/12)`, valor:feriasPropBase});
  if(feriasPropTerco>0) proventos.push({nome:'1/3 sobre férias proporcionais', valor:feriasPropTerco});
  if(feriasVencBase>0) proventos.push({nome:'Férias vencidas', valor:feriasVencBase});
  if(feriasVencTerco>0) proventos.push({nome:'1/3 sobre férias vencidas', valor:feriasVencTerco});
  const descontos=[];
  if(inssSaldo.valor>0) descontos.push({nome:'INSS sobre saldo de salário', valor:inssSaldo.valor});
  if(irrfSaldo.valor>0) descontos.push({nome:'IRRF sobre saldo de salário', valor:irrfSaldo.valor});
  if(inss13.valor>0) descontos.push({nome:'INSS sobre 13º salário', valor:inss13.valor});
  if(irrf13.valor>0) descontos.push({nome:'IRRF sobre 13º salário', valor:irrf13.valor});
  if(avisoDesconto>0) descontos.push({nome:'Aviso prévio não cumprido', valor:avisoDesconto});
  const totalProventos=r2(proventos.reduce((s,p)=>s+p.valor,0));
  const totalDescontos=r2(descontos.reduce((s,d)=>s+d.valor,0));
  const liquidoRescisao=r2(totalProventos-totalDescontos);
  const totalGeral=r2(liquidoRescisao+fgtsSaque+multaFGTS);
  return {
    bruto:r2(bruto), motivo, anos, totalMeses, diasAviso, projeta, avos13, avosFerias,
    proventos, descontos, totalProventos, totalDescontos, liquidoRescisao,
    fgts:{ base:fgtsBase, estimado:fgtsEstimado, multaPct:devido.multaPct, multa:multaFGTS, saquePct:devido.saquePct, saque:fgtsSaque },
    totalGeral, seguroDesemprego:devido.seguro,
    detalhe:{ inss13, irrf13, inssSaldo, irrfSaldo, saldoSalario, feriasVencBase },
  };
}

function folhaCompleta({ bruto, deps=0, pensao=0,
  heQtd50=0, heQtd100=0, hJornadaMensal=220,
  adicNoturno=false, horasNoturnas=0,
  insalubridadeGrau='nenhum', periculosidade=false,
  comissoes=0, outros_proventos=0,
  sfFilhos=0,
  desVT=0, desAlimentacao=0, desPrevPriv=0, desPlanoSaude=0, desOutros=0,
}){
  bruto = nz(bruto);
  const horaBase = bruto / (nz(hJornadaMensal)||220);
  const heValor50  = r2(horaBase * 1.50 * nz(heQtd50));
  const heValor100 = r2(horaBase * 2.00 * nz(heQtd100));
  const adicNoturnoValor = adicNoturno ? r2(horaBase * (52.5/60) * 0.20 * nz(horasNoturnas)) : 0;
  let insaVal = 0;
  if(insalubridadeGrau==='min10') insaVal = r2(SALARIO_MINIMO * 0.10);
  else if(insalubridadeGrau==='min20') insaVal = r2(SALARIO_MINIMO * 0.20);
  else if(insalubridadeGrau==='min40') insaVal = r2(SALARIO_MINIMO * 0.40);
  else if(insalubridadeGrau==='base10') insaVal = r2(bruto * 0.10);
  else if(insalubridadeGrau==='base20') insaVal = r2(bruto * 0.20);
  else if(insalubridadeGrau==='base40') insaVal = r2(bruto * 0.40);
  const perVal = periculosidade ? r2(bruto * 0.30) : 0;
  const sfQualifica = bruto <= SF_TETO;
  const sfValor = sfQualifica ? r2(nz(sfFilhos) * SF_VALOR) : 0;
  const brutoTrib = r2(bruto + heValor50 + heValor100 + adicNoturnoValor + insaVal + perVal + nz(comissoes) + nz(outros_proventos));
  const brutoTotal = r2(brutoTrib + sfValor);
  const inss = calcINSS(brutoTrib);
  const deducaoPrevPriv = nz(desPrevPriv);
  const irrf = calcIRRF(brutoTrib, inss.valor, nz(deps), nz(pensao) + deducaoPrevPriv);
  const maxVT = r2(bruto * 0.06);
  const descVT = Math.min(nz(desVT), maxVT);
  const totalDesc = r2(inss.valor + irrf.valor + descVT + nz(desAlimentacao) + nz(desPrevPriv) + nz(desPlanoSaude) + nz(desOutros) + nz(pensao));
  const liquido = r2(brutoTotal - totalDesc);
  return {
    bruto:r2(bruto), brutoTrib, brutoTotal, sfValor, sfQualifica,
    heValor50, heValor100, adicNoturnoValor, insaVal, perVal,
    comissoes:r2(nz(comissoes)), outros_proventos:r2(nz(outros_proventos)),
    inss, irrf,
    descVT:r2(descVT), maxVT,
    desAlimentacao:r2(nz(desAlimentacao)),
    desPrevPriv:r2(nz(desPrevPriv)),
    desPlanoSaude:r2(nz(desPlanoSaude)),
    desOutros:r2(nz(desOutros)),
    pensao:r2(nz(pensao)),
    totalDesc, liquido,
  };
}

function seguroDesemprego({ s1, s2, s3, formalTempo }){
  const media = r2((nz(s1)+nz(s2)+nz(s3))/3);
  let parcela;
  if(media <= 2108.17)      parcela = r2(media * 0.80);
  else if(media <= 3519.11) parcela = r2(1686.54 + (media - 2108.17) * 0.50);
  else                      parcela = 2388.28;
  parcela = Math.max(parcela, SALARIO_MINIMO);
  parcela = r2(parcela);
  let nParcelas = 3;
  const m = nz(formalTempo);
  if(m >= 6  && m <= 11)  nParcelas = 3;
  else if(m >= 12 && m <= 23) nParcelas = 4;
  else if(m >= 24)         nParcelas = 5;
  return { media, parcela, nParcelas, total:r2(parcela*nParcelas) };
}

function pjVsClt({ salarioCLT, remuneracaoPJ, regimePJ='simples6', inssAutoVoluntario=true }){
  salarioCLT = nz(salarioCLT); remuneracaoPJ = nz(remuneracaoPJ);
  const clt = folhaCompleta({ bruto:salarioCLT });
  const fgts = r2(salarioCLT * 0.08);
  const ferias13 = r2((salarioCLT * 4) / 36);
  const totalCLT = r2(clt.liquido + fgts + ferias13);
  const aliqMap = { simples6:0.06, simples15:0.15, lucro_presumido:0.135, mei:MEI_DAS/remuneracaoPJ };
  let impostosPJ;
  if(regimePJ === 'mei'){
    impostosPJ = MEI_DAS;
  } else {
    const aliqPJ = aliqMap[regimePJ] || 0.06;
    impostosPJ = r2(remuneracaoPJ * aliqPJ);
  }
  const aliqPJ = regimePJ === 'mei' ? MEI_DAS/remuneracaoPJ : (aliqMap[regimePJ] || 0.06);
  const liquidoPJBruto = r2(remuneracaoPJ - impostosPJ);
  const inssAuto = inssAutoVoluntario ? r2(Math.min(remuneracaoPJ * 0.11, SALARIO_MINIMO * 0.11)) : 0;
  const liquidoPJ = r2(liquidoPJBruto - inssAuto);
  const diferenca = r2(liquidoPJ - totalCLT);
  const pjVantagem = diferenca > 0;
  let brutoEq = liquidoPJ;
  for(let i=0;i<20;i++){
    const tentativa = folhaCompleta({ bruto:brutoEq });
    const err = tentativa.liquido - liquidoPJ;
    if(Math.abs(err)<0.5) break;
    brutoEq = r2(brutoEq - err * 0.7);
  }
  return { clt:{ ...clt, fgts, ferias13, totalCLT }, pj:{ remuneracaoPJ, impostosPJ, liquidoPJBruto, inssAuto, liquidoPJ, aliqPJ }, diferenca, pjVantagem, brutoEquivalenteCLT:r2(brutoEq) };
}

function auxilioDoenca({ salarioBruto, mesesContrib=12, afastamento=16 }){
  salarioBruto = nz(salarioBruto);
  const salBeneficio = Math.min(r2(salarioBruto), INSS_TETO);
  const valorBenef = r2(salBeneficio * 0.91);
  const diasCarencia = 15;
  const diasINSS = Math.max(0, nz(afastamento) - diasCarencia);
  const valorEmpregador = r2((salarioBruto/30)*Math.min(15, nz(afastamento)));
  const valorINSS = diasINSS > 0 ? r2((valorBenef/30)*diasINSS) : 0;
  return { salBeneficio, valorBenef, diasCarencia, diasINSS, valorEmpregador, valorINSS, mesesContrib:nz(mesesContrib), afastamento:nz(afastamento) };
}

function salarioMaternidade({ salarioBruto, tipoVinculo='clt', deps=0, duracao=120 }){
  salarioBruto = nz(salarioBruto);
  duracao = nz(duracao)||120;
  let valorMensal, base;
  if(tipoVinculo==='clt'){
    base = salarioBruto;
    valorMensal = base;
  } else {
    base = Math.min(salarioBruto, INSS_TETO);
    valorMensal = base;
  }
  const inss = calcINSS(valorMensal);
  const irrf = calcIRRF(valorMensal, inss.valor, nz(deps));
  const liquido = r2(valorMensal - inss.valor - irrf.valor);
  const periodos = Math.ceil(duracao/30);
  const totalLiquido = r2(liquido * periodos);
  return { valorMensal:r2(valorMensal), inss, irrf, liquido, duracao, periodos, totalLiquido, tipoVinculo };
}

/* =====================================================================
   HELPERS de apresentação
   ===================================================================== */
const BRL = (x) => (isFinite(x)?x:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const PCT = (x) => (isFinite(x)?x:0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2})+'%';

function memINSS(base, inss, rotulo){
  rotulo = rotulo || 'INSS';
  if(!inss || inss.valor<=0) return `${rotulo}: base de ${BRL(base)} — sem desconto na faixa.`;
  return `${rotulo}: base ${BRL(inss.baseUsada)}${inss.teto?' (teto do INSS)':''} × ${PCT(inss.faixa.aliq*100)} − parcela a deduzir ${BRL(inss.faixa.deduz)} = ${BRL(inss.valor)} · alíquota efetiva ${PCT(inss.aliqEfetiva)}.`;
}

function memIRRF(irrf, rotulo){
  rotulo = rotulo || 'IRRF';
  if(!irrf) return null;
  const ded = irrf.usouSimplificado ? `desconto simplificado de ${BRL(IRRF_SIMPLIFICADO)}` : `deduções legais de ${BRL(irrf.deducaoUsada)} (INSS + dependentes)`;
  let s = `${rotulo}: base de ${BRL(irrf.base)} após ${ded}.`;
  if(irrf.impostoApurado>0){
    s += ` Imposto pela tabela: ${BRL(irrf.impostoApurado)}.`;
    if(irrf.redutor>0) s += ` Redutor da Lei 15.270/2025: −${BRL(irrf.redutor)}.`;
    s += ` Devido: ${BRL(irrf.valor)}.`;
  } else {
    s += ` Faixa isenta — sem imposto.`;
  }
  return s;
}

/* =====================================================================
   OBJETO CALCS — 11 calculadoras
   ===================================================================== */
const ic = {
  liquido:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  rescisao:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4 13V4a2 2 0 0 1 2-2h9l5 5v4"/><path d="M3 17l4 4M7 17l-4 4"/><path d="M11 17h10"/></svg>',
  ferias:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20"/><path d="M5 18l1.5-5"/><path d="M19 18l-7-12a3 3 0 0 0-5 1"/><circle cx="17" cy="5" r="2"/></svg>',
  decimo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V5a2 2 0 0 1 2-2c1.5 0 2 1 2 2M12 8V5a2 2 0 0 0-2-2C8.5 3 8 4 8 5"/><path d="M12 8v13"/></svg>',
  horas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  noturno:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>',
  seguro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  pj:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  auxilio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  maternidade:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6M12 9v6"/><circle cx="12" cy="12" r="9"/></svg>',
  ir:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 10h2l2-4 2 8 2-4h2"/></svg>',
};

const CALCS = {
  liquido:{
    nome:'Salário líquido', icone:ic.liquido,
    titulo:'Salário líquido — holerite completo', demoTit:'Holerite estimado',
    desc:'Simule o salário líquido com todos os adicionais e descontos: insalubridade, periculosidade, horas extras, vale-transporte, plano de saúde e mais.',
    campos:[
      {id:'bruto', tipo:'moeda', rot:'Salário base mensal', def:''},
      {id:'deps', tipo:'numero', rot:'Dependentes p/ IR', def:'0', min:0, max:20, meia:true},
      {id:'pensao', tipo:'moeda', rot:'Pensão alimentícia', def:'', meia:true},
      {id:'_sep1', tipo:'secao', rot:'Adicionais'},
      {id:'heQtd50', tipo:'numero', rot:'Horas extras a 50%', def:'0', min:0, passo:'0.5', meia:true},
      {id:'heQtd100', tipo:'numero', rot:'Horas extras a 100%', def:'0', min:0, passo:'0.5', meia:true},
      {id:'adicNoturno', tipo:'check', rot:'Tem adicional noturno (20% — horas entre 22h e 5h)'},
      {id:'horasNoturnas', tipo:'numero', rot:'Horas noturnas no mês', def:'0', min:0, showIf:(v)=>v.adicNoturno},
      {id:'insalubridadeGrau', tipo:'select', rot:'Insalubridade', def:'nenhum', opcoes:[
        {v:'nenhum', t:'Não há'},
        {v:'min10', t:'Mínimo: grau mínimo (10% do SM)'},
        {v:'min20', t:'Médio: grau médio (20% do SM)'},
        {v:'min40', t:'Máximo: grau máximo (40% do SM)'},
        {v:'base10', t:'CCT: 10% do salário base'},
        {v:'base20', t:'CCT: 20% do salário base'},
        {v:'base40', t:'CCT: 40% do salário base'},
      ]},
      {id:'periculosidade', tipo:'check', rot:'Periculosidade (30% sobre salário base)'},
      {id:'sfFilhos', tipo:'numero', rot:'Filhos p/ salário-família', def:'0', min:0, max:10, meia:true, dica:`base ≤ R$ ${SF_TETO.toLocaleString('pt-BR',{minimumFractionDigits:2})}`},
      {id:'comissoes', tipo:'moeda', rot:'Comissões', def:'', meia:true},
      {id:'outros_proventos', tipo:'moeda', rot:'Outros proventos', def:''},
      {id:'_sep2', tipo:'secao', rot:'Descontos'},
      {id:'desVT', tipo:'moeda', rot:'Vale-transporte (custo total)', def:'', meia:true, dica:'desconto limitado a 6% do salário'},
      {id:'desAlimentacao', tipo:'moeda', rot:'Vale-alimentação / refeição', def:'', meia:true},
      {id:'desPrevPriv', tipo:'moeda', rot:'Previdência privada (PGBL)', def:'', meia:true, dica:'dedutível no IR'},
      {id:'desPlanoSaude', tipo:'moeda', rot:'Plano de saúde', def:'', meia:true},
      {id:'desOutros', tipo:'moeda', rot:'Outros descontos', def:''},
      {id:'hJornadaMensal', tipo:'numero', rot:'Jornada mensal (horas)', def:'220', min:1, max:300, dica:'para cálculo das horas extras'},
    ],
    calcular(v){
      if(v.bruto<=0) return {vazio:true};
      const r = folhaCompleta(v);
      const proventos=[{nome:'Salário base', valor:r.bruto}];
      if(r.heValor50>0)       proventos.push({nome:`Horas extras 50% (${v.heQtd50}h)`, valor:r.heValor50});
      if(r.heValor100>0)      proventos.push({nome:`Horas extras 100% (${v.heQtd100}h)`, valor:r.heValor100});
      if(r.adicNoturnoValor>0)proventos.push({nome:`Adicional noturno (${v.horasNoturnas}h × 20%)`, valor:r.adicNoturnoValor});
      if(r.insaVal>0)         proventos.push({nome:'Insalubridade', valor:r.insaVal});
      if(r.perVal>0)          proventos.push({nome:'Periculosidade (30%)', valor:r.perVal});
      if(r.comissoes>0)       proventos.push({nome:'Comissões', valor:r.comissoes});
      if(r.outros_proventos>0)proventos.push({nome:'Outros proventos', valor:r.outros_proventos});
      if(r.sfValor>0)         proventos.push({nome:`Salário-família (${v.sfFilhos} filho${v.sfFilhos>1?'s':''})`, valor:r.sfValor});
      const descontos=[];
      if(r.inss.valor>0)     descontos.push({nome:`INSS (${PCT(r.inss.aliqEfetiva)} efetivo)`, valor:r.inss.valor});
      if(r.irrf.valor>0)     descontos.push({nome:`IRRF (${PCT(r.irrf.aliq*100)})`, valor:r.irrf.valor});
      if(r.pensao>0)         descontos.push({nome:'Pensão alimentícia', valor:r.pensao});
      if(r.descVT>0)         descontos.push({nome:`Vale-transporte (desc. de 6%)`, valor:r.descVT});
      if(r.desAlimentacao>0) descontos.push({nome:'Vale-alimentação / refeição', valor:r.desAlimentacao});
      if(r.desPrevPriv>0)    descontos.push({nome:'Previdência privada', valor:r.desPrevPriv});
      if(r.desPlanoSaude>0)  descontos.push({nome:'Plano de saúde', valor:r.desPlanoSaude});
      if(r.desOutros>0)      descontos.push({nome:'Outros descontos', valor:r.desOutros});
      const avisos=[];
      if(!r.sfQualifica && v.sfFilhos>0)
        avisos.push({tipo:'warn', txt:`Salário-família não concedido: salário base (${BRL(r.bruto)}) supera o teto de ${BRL(SF_TETO)}.`});
      if(v.desVT>0 && r.descVT < v.desVT)
        avisos.push({tipo:'info', txt:`Desconto de VT limitado a 6% do salário base: ${BRL(r.maxVT)} (custo informado: ${BRL(v.desVT)}).`});
      if(r.irrf.usouSimplificado)
        avisos.push({tipo:'info', txt:'IRRF: aplicado o desconto simplificado (R$ 607,20) por ser mais vantajoso.'});
      const memoria=[
        `Bruto tributável: ${BRL(r.brutoTrib)}${r.sfValor>0?' (salário-família isento e excluído da base)':''}.`,
        memINSS(r.brutoTrib, r.inss), memIRRF(r.irrf),
      ];
      if(r.insaVal>0) memoria.push(`Insalubridade calculada sobre ${v.insalubridadeGrau.startsWith('min')?`salário mínimo (${BRL(SALARIO_MINIMO)})`:`salário base (${BRL(r.bruto)})`}.`);
      if(r.perVal>0)  memoria.push(`Periculosidade: 30% × ${BRL(r.bruto)} = ${BRL(r.perVal)}.`);
      return { proventos, descontos, destaque:{label:'Salário líquido', sub:'no mês', valor:r.liquido}, memoria, avisos };
    }
  },

  rescisao:{
    nome:'Rescisão', icone:ic.rescisao,
    titulo:'Rescisão de contrato', demoTit:'Verbas rescisórias',
    desc:'Saldo, aviso, 13º e férias proporcionais, mais FGTS e multa conforme o motivo.',
    campos:[
      {id:'bruto', tipo:'moeda', rot:'Último salário mensal', def:''},
      {id:'motivo', tipo:'select', rot:'Motivo do desligamento', def:'sem_justa_causa', opcoes:[
        {v:'sem_justa_causa', t:'Dispensa sem justa causa'},
        {v:'pedido', t:'Pedido de demissão'},
        {v:'acordo', t:'Acordo entre as partes'},
        {v:'justa_causa', t:'Dispensa por justa causa'},
      ]},
      {id:'admissao', tipo:'data', rot:'Admissão', def:'', meia:true},
      {id:'desligamento', tipo:'data', rot:'Desligamento', def:'', meia:true},
      {id:'aviso', tipo:'select', rot:'Aviso prévio', def:'indenizado',
        showIf:(v)=> v.motivo==='sem_justa_causa' || v.motivo==='pedido',
        opcoes:[
          {v:'indenizado', t:'Indenizado (não trabalhado)'},
          {v:'trabalhado', t:'Trabalhado / cumprido'},
          {v:'nao_cumprido', t:'Não cumprido (gera desconto)'},
        ]},
      {id:'saldoFGTS', tipo:'moeda', rot:'Saldo de FGTS', def:'', dica:'opcional — estima se vazio'},
      {id:'temFeriasVencidas', tipo:'check', rot:'Possui férias vencidas (período completo não gozado)'},
      {id:'diasFeriasVencidas', tipo:'numero', rot:'Dias de férias vencidas', def:'30', min:1, max:30,
        showIf:(v)=> v.temFeriasVencidas},
    ],
    calcular(v){
      if(v.bruto<=0 || !v.admissao || !v.desligamento) return {vazio:true};
      const r = rescisao({
        bruto:v.bruto, admissao:v.admissao, desligamento:v.desligamento, motivo:v.motivo,
        aviso:v.aviso, temFeriasVencidas:v.temFeriasVencidas, diasFeriasVencidas:v.diasFeriasVencidas,
        saldoFGTS: v.saldoFGTS>0 ? v.saldoFGTS : null,
      });
      if(r.erro) return {erro:r.erro};
      const blocos=[];
      const linhasFGTS=[];
      if(r.fgts.saque>0) linhasFGTS.push({nome:`Saque do FGTS (${PCT(r.fgts.saquePct*100)} do saldo)`, valor:r.fgts.saque, pos:true});
      if(r.fgts.multa>0) linhasFGTS.push({nome:`Multa do FGTS (${PCT(r.fgts.multaPct*100)})`, valor:r.fgts.multa, pos:true});
      if(linhasFGTS.length){
        linhasFGTS.unshift({nome:'Líquido das verbas (folha)', valor:r.liquidoRescisao, pos:false});
        blocos.push({titulo:'Composição do total', linhas:linhasFGTS});
      }
      const avisos=[];
      if(r.seguroDesemprego) avisos.push({tipo:'info', txt:'Pode haver direito ao seguro-desemprego, conforme tempo de vínculo e parcelas já recebidas.'});
      if(r.fgts.estimado && r.fgts.base>0) avisos.push({tipo:'warn', txt:`Saldo de FGTS estimado em ${BRL(r.fgts.base)} (8% × salário × ${r.totalMeses} meses). Informe o saldo real para mais precisão.`});
      if(v.motivo==='justa_causa') avisos.push({tipo:'warn', txt:'Na justa causa não há aviso, 13º proporcional, férias proporcionais, saque ou multa do FGTS.'});
      avisos.push({tipo:'info', txt:'IR e INSS incidem apenas sobre o saldo de salário e o 13º proporcional. Aviso indenizado, férias + 1/3 e multa do FGTS são isentos. Pela isenção de 2026 (até R$ 5.000), parcelas menores costumam ficar sem IR.'});
      const memoria=[
        `Tempo de casa: ${r.anos} ano(s) completo(s) · ${r.totalMeses} meses de vínculo.`,
        `Aviso prévio: 30 + 3 × ${r.anos} = ${r.diasAviso} dias (Lei 12.506/2011, limite de 90).`,
        r.projeta ? `Aviso indenizado projeta o contrato em ${r.diasAviso} dias para contar os avos.` : `Sem projeção de aviso sobre os avos.`,
        `Avos: 13º conta ${r.avos13}/12 e férias ${r.avosFerias}/12 (mês com 15+ dias = 1 avo).`,
      ];
      if(r.detalhe.inssSaldo.valor>0 || r.detalhe.irrfSaldo.valor>0){
        memoria.push(memINSS(r.detalhe.saldoSalario, r.detalhe.inssSaldo, 'INSS (saldo)'));
        if(r.detalhe.irrfSaldo.valor>0) memoria.push(memIRRF(r.detalhe.irrfSaldo, 'IRRF (saldo)'));
      }
      if(r.detalhe.inss13.valor>0) memoria.push(`13º tributado em separado — ${memINSS((r.bruto/12)*r.avos13, r.detalhe.inss13, 'INSS (13º)')}`);
      memoria.push('Aviso indenizado, férias (proporcionais e vencidas) + 1/3 e a multa do FGTS são isentos de INSS e IRRF.');
      return { proventos:r.proventos, descontos:r.descontos, destaque:{label:'Total da rescisão', sub:'verbas + FGTS + multa', valor:r.totalGeral}, blocos, avisos, memoria };
    }
  },

  ferias:{
    nome:'Férias', icone:ic.ferias,
    titulo:'Férias', demoTit:'Recibo de férias',
    desc:'Férias + 1/3 constitucional, com opção de vender até 10 dias (abono).',
    campos:[
      {id:'bruto', tipo:'moeda', rot:'Salário bruto mensal', def:''},
      {id:'dias', tipo:'numero', rot:'Total de dias de férias', def:'30', min:1, max:30, meia:true, dica:'normalmente 30'},
      {id:'venderDias', tipo:'numero', rot:'Dias que vai vender', def:'0', min:0, max:10, meia:true, dica:'venda de até 10 dias (abono)'},
      {id:'deps', tipo:'numero', rot:'Dependentes', def:'0', min:0, max:20, dica:'p/ IR'},
    ],
    calcular(v){
      if(v.bruto<=0) return {vazio:true};
      const r = ferias({ bruto:v.bruto, dias:v.dias, venderDias:v.venderDias, deps:v.deps });
      const proventos=[];
      if(r.valorGozo>0) proventos.push({nome:`Férias (${r.diasGozo} dias de gozo)`, valor:r.valorGozo});
      if(r.tercoGozo>0) proventos.push({nome:'1/3 constitucional', valor:r.tercoGozo});
      if(r.abono>0) proventos.push({nome:`Venda de ${r.venderDias} dia${r.venderDias>1?'s':''} de férias (abono pecuniário)`, valor:r.abono});
      if(r.tercoAbono>0) proventos.push({nome:'1/3 sobre os dias vendidos', valor:r.tercoAbono});
      const descontos=[];
      if(r.inss.valor>0) descontos.push({nome:`INSS (${PCT(r.inss.aliqEfetiva)} efetivo)`, valor:r.inss.valor});
      if(r.irrf.valor>0) descontos.push({nome:`IRRF (${PCT(r.irrf.aliq*100)})`, valor:r.irrf.valor});
      const avisos=[];
      avisos.push({tipo:'info', txt:'Abono pecuniário = venda de até 10 dias das férias. Você descansa menos dias e recebe esses dias em dinheiro. O valor da venda e seu 1/3 são isentos de INSS e IRRF.'});
      const memoria=[
        `Base do dia: ${BRL(r.bruto)} ÷ 30 = ${BRL(r.bruto/30)}.`,
        `Tributação incide só sobre férias gozadas + 1/3: base de ${BRL(r.baseTributavel)}.`,
        memINSS(r.baseTributavel, r.inss), memIRRF(r.irrf),
      ];
      return { proventos, descontos, destaque:{label:'Total a receber', sub:'férias líquidas', valor:r.liquido}, memoria, avisos };
    }
  },

  decimo:{
    nome:'13º salário', icone:ic.decimo,
    titulo:'13º salário', demoTit:'13º — demonstrativo',
    desc:'Gratificação proporcional aos meses trabalhados, com as duas parcelas.',
    campos:[
      {id:'bruto', tipo:'moeda', rot:'Salário bruto mensal', def:''},
      {id:'meses', tipo:'numero', rot:'Meses trabalhados no ano', def:'12', min:1, max:12, meia:true, dica:'15+ dias = 1 mês'},
      {id:'deps', tipo:'numero', rot:'Dependentes', def:'0', min:0, max:20, meia:true, dica:'p/ IR'},
    ],
    calcular(v){
      if(v.bruto<=0) return {vazio:true};
      const r = decimoTerceiro({ bruto:v.bruto, meses:v.meses, deps:v.deps });
      const proventos=[{nome:`13º bruto (${r.meses}/12)`, valor:r.bruto13}];
      const descontos=[];
      if(r.inss.valor>0) descontos.push({nome:`INSS (${PCT(r.inss.aliqEfetiva)} efetivo)`, valor:r.inss.valor});
      if(r.irrf.valor>0) descontos.push({nome:`IRRF (${PCT(r.irrf.aliq*100)})`, valor:r.irrf.valor});
      const blocos=[{titulo:'Parcelas', linhas:[
        {nome:'1ª parcela (até 30/11, sem desconto)', valor:r.primeira, pos:false},
        {nome:'2ª parcela (até 20/12, com descontos)', valor:r.segunda, pos:false},
      ]}];
      const memoria=[
        `13º proporcional: ${BRL(r.bruto)} ÷ 12 × ${r.meses} = ${BRL(r.bruto13)}.`,
        '1ª parcela = 50% do bruto, sem descontos. INSS e IRRF saem todos na 2ª parcela.',
        memINSS(r.bruto13, r.inss), memIRRF(r.irrf),
      ];
      return { proventos, descontos, destaque:{label:'13º líquido', sub:'soma das parcelas', valor:r.liquidoTotal}, blocos, memoria, avisos:[] };
    }
  },

  horas:{
    nome:'Horas extras', icone:ic.horas,
    titulo:'Horas extras', demoTit:'Horas extras',
    desc:'Valor das horas adicionais sobre a jornada, com reflexo opcional no DSR.',
    campos:[
      {id:'bruto', tipo:'moeda', rot:'Salário bruto mensal', def:''},
      {id:'qtdHoras', tipo:'numero', rot:'Quantidade de horas extras', def:'', min:0, passo:'0.5', meia:true},
      {id:'percentual', tipo:'select', rot:'Adicional', def:'50', meia:true, opcoes:[
        {v:'50', t:'50% (dia útil)'},
        {v:'100', t:'100% (domingo/feriado)'},
        {v:'60', t:'60%'},
        {v:'70', t:'70%'},
      ]},
      {id:'jornadaMensal', tipo:'numero', rot:'Jornada mensal (horas)', def:'220', min:1, max:300, dica:'220h = 44h/semana'},
      {id:'dsr', tipo:'check', rot:'Incluir reflexo no DSR (descanso semanal)'},
      {id:'diasUteis', tipo:'numero', rot:'Dias úteis no mês', def:'25', min:1, max:27, meia:true, showIf:(v)=>v.dsr},
      {id:'domingosFeriados', tipo:'numero', rot:'Domingos + feriados', def:'5', min:1, max:10, meia:true, showIf:(v)=>v.dsr},
    ],
    calcular(v){
      if(v.bruto<=0 || v.qtdHoras<=0) return {vazio:true};
      const r = horasExtras({ bruto:v.bruto, jornadaMensal:v.jornadaMensal, qtdHoras:v.qtdHoras, percentual:Number(v.percentual), dsr:v.dsr, diasUteis:v.diasUteis, domingosFeriados:v.domingosFeriados });
      const proventos=[{nome:`${r.qtdHoras} h extras a ${PCT(r.percentual)}`, valor:r.totalHE}];
      if(r.valorDSR>0) proventos.push({nome:'Reflexo no DSR', valor:r.valorDSR});
      const memoria=[
        `Valor da hora normal: ${BRL(v.bruto)} ÷ ${v.jornadaMensal}h = ${BRL(r.valorHora)}.`,
        `Hora extra: ${BRL(r.valorHora)} + ${PCT(r.percentual)} = ${BRL(r.valorHoraExtra)}.`,
        `Total: ${BRL(r.valorHoraExtra)} × ${r.qtdHoras}h = ${BRL(r.totalHE)}.`,
      ];
      if(r.valorDSR>0) memoria.push(`DSR: ${BRL(r.totalHE)} ÷ ${v.diasUteis} dias úteis × ${v.domingosFeriados} = ${BRL(r.valorDSR)}.`);
      const avisos=[{tipo:'info', txt:'Valor bruto das horas extras. O total entra na base do mês e sofre INSS e IRRF junto com o salário.'}];
      return { proventos, descontos:[], destaque:{label:'Total em horas extras', sub:'valor bruto no mês', valor:r.total}, memoria, avisos };
    }
  },

  noturno:{
    nome:'Adicional noturno', icone:ic.noturno,
    titulo:'Adicional noturno', demoTit:'Adicional noturno',
    desc:'Calculadora do adicional de 20% para trabalho entre 22h e 5h, com hora noturna reduzida (52min30s).',
    campos:[
      {id:'bruto', tipo:'moeda', rot:'Salário base mensal', def:''},
      {id:'jornadaMensal', tipo:'numero', rot:'Jornada mensal (horas)', def:'220', min:1, max:300, meia:true},
      {id:'horasNoturnas', tipo:'numero', rot:'Horas noturnas trabalhadas', def:'', min:0, passo:'0.5', meia:true},
      {id:'dsr', tipo:'check', rot:'Incluir reflexo no DSR'},
      {id:'diasUteis', tipo:'numero', rot:'Dias úteis no mês', def:'25', min:1, max:27, meia:true, showIf:(v)=>v.dsr},
      {id:'domingosFeriados', tipo:'numero', rot:'Domingos + feriados', def:'5', min:1, max:10, meia:true, showIf:(v)=>v.dsr},
    ],
    calcular(v){
      if(v.bruto<=0 || v.horasNoturnas<=0) return {vazio:true};
      const jornadaMensal = nz(v.jornadaMensal)||220;
      const horaBase = r2(v.bruto / jornadaMensal);
      const horasNot = r2(nz(v.horasNoturnas) * (60/52.5));
      const adicPct = 0.20;
      const adicValor = r2(horaBase * adicPct * horasNot);
      let dsrValor = 0;
      if(v.dsr && nz(v.diasUteis)>0) dsrValor = r2((adicValor/nz(v.diasUteis))*nz(v.domingosFeriados));
      const total = r2(adicValor + dsrValor);
      const proventos=[{nome:`Adicional noturno (${v.horasNoturnas}h × 20%)`, valor:adicValor}];
      if(dsrValor>0) proventos.push({nome:'Reflexo no DSR', valor:dsrValor});
      const memoria=[
        `Hora base: ${BRL(v.bruto)} ÷ ${jornadaMensal}h = ${BRL(horaBase)}.`,
        `Hora noturna reduzida: cada hora real = 60/52,5 = 1,143 horas contadas. ${v.horasNoturnas}h × 1,143 = ${horasNot.toFixed(2)}h.`,
        `Adicional: ${BRL(horaBase)} × 20% × ${horasNot.toFixed(2)}h = ${BRL(adicValor)}.`,
      ];
      if(dsrValor>0) memoria.push(`DSR: ${BRL(adicValor)} ÷ ${v.diasUteis} dias úteis × ${v.domingosFeriados} domingos/feriados = ${BRL(dsrValor)}.`);
      return { proventos, descontos:[], destaque:{label:'Adicional noturno', sub:'valor bruto mensal', valor:total}, memoria, avisos:[{tipo:'info', txt:'O adicional noturno integra a base de cálculo do INSS e IRRF junto com o salário mensal.'}] };
    }
  },

  seguro:{
    nome:'Seguro-desemprego', icone:ic.seguro,
    titulo:'Seguro-desemprego', demoTit:'Parcelas do seguro',
    desc:'Valor e número de parcelas do seguro-desemprego, baseado na média dos últimos três salários.',
    campos:[
      {id:'s1', tipo:'moeda', rot:'Salário do último mês', def:''},
      {id:'s2', tipo:'moeda', rot:'Penúltimo mês', def:'', meia:true},
      {id:'s3', tipo:'moeda', rot:'Antepenúltimo mês', def:'', meia:true},
      {id:'formalTempo', tipo:'numero', rot:'Meses trabalhados no último emprego', def:'12', min:0, dica:'mín. 6 meses para ter direito'},
    ],
    calcular(v){
      if(v.s1<=0) return {vazio:true};
      if(v.formalTempo < 6) return { erro:'São necessários pelo menos 6 meses de vínculo formal para ter direito ao seguro-desemprego.' };
      const r = seguroDesemprego({ s1:v.s1, s2:v.s2||v.s1, s3:v.s3||v.s1, formalTempo:v.formalTempo });
      const blocos=[{titulo:`${r.nParcelas} parcelas`, linhas:Array.from({length:r.nParcelas},(_,i)=>({nome:`${i+1}ª parcela`, valor:r.parcela, pos:true}))}];
      const memoria=[
        `Média salarial: (${BRL(v.s1)} + ${BRL(v.s2||v.s1)} + ${BRL(v.s3||v.s1)}) ÷ 3 = ${BRL(r.media)}.`,
        r.media<=2108.17
          ? `Faixa 1 (até R$ 2.108,17): ${BRL(r.media)} × 80% = ${BRL(r.parcela)}.`
          : r.media<=3519.11
          ? `Faixa 2: R$ 1.686,54 + (${BRL(r.media)} − R$ 2.108,17) × 50% = ${BRL(r.parcela)}.`
          : `Faixa 3 (acima de R$ 3.519,11): parcela máxima de ${BRL(r.parcela)}.`,
        `Número de parcelas: ${r.nParcelas} (${v.formalTempo} meses de vínculo).`,
        'O benefício não pode ser inferior ao salário mínimo.',
      ];
      return { proventos:[], descontos:[], blocos, destaque:{label:'Total do seguro', sub:`${r.nParcelas} parcelas de ${BRL(r.parcela)}`, valor:r.total}, memoria, avisos:[{tipo:'info', txt:'Valores sem dedução de IR (seguro-desemprego é isento de IRRF).'}] };
    }
  },

  pj:{
    nome:'PJ vs CLT', icone:ic.pj,
    titulo:'Vale mais como PJ ou CLT?', demoTit:'Comparativo PJ × CLT',
    desc:'Simule a proposta PJ comparada ao salário CLT, considerando impostos, FGTS, férias e 13º.',
    campos:[
      {id:'salarioCLT', tipo:'moeda', rot:'Salário bruto CLT atual', def:''},
      {id:'remuneracaoPJ', tipo:'moeda', rot:'Remuneração PJ oferecida', def:''},
      {id:'regimePJ', tipo:'select', rot:'Regime tributário da PJ', def:'simples6', opcoes:[
        {v:'simples6', t:'Simples Nacional — 6% (serviços nível 1)'},
        {v:'simples15', t:'Simples Nacional — 15% (serviços nível 3)'},
        {v:'lucro_presumido', t:'Lucro Presumido — ~13,5%'},
        {v:'mei', t:'MEI — valor fixo (DAS ≈ R$ 80,90/mês)'},
      ]},
      {id:'inssAutoVoluntario', tipo:'check', rot:'Incluir INSS autônomo (11% sobre o SM — garante benefícios)'},
    ],
    calcular(v){
      if(v.salarioCLT<=0 || v.remuneracaoPJ<=0) return {vazio:true};
      const r = pjVsClt({ salarioCLT:v.salarioCLT, remuneracaoPJ:v.remuneracaoPJ, regimePJ:v.regimePJ, inssAutoVoluntario:v.inssAutoVoluntario });
      const aliqNome = {simples6:'Simples 6%',simples15:'Simples 15%',lucro_presumido:'Lucro Presumido ~13,5%',mei:'MEI (DAS fixo)'}[v.regimePJ]||v.regimePJ;
      const blocos=[
        {titulo:'Análise CLT', linhas:[
          {nome:'Salário líquido (no mês)', valor:r.clt.liquido, pos:false},
          {nome:'FGTS equivalente (8%)', valor:r.clt.fgts, pos:true},
          {nome:'Férias + 13º mensalizados', valor:r.clt.ferias13, pos:true},
          {nome:'Total CLT equivalente mensal', valor:r.clt.totalCLT, pos:false},
        ]},
        {titulo:`Análise PJ (${aliqNome})`, linhas:[
          {nome:'Remuneração bruta', valor:r.pj.remuneracaoPJ, pos:false},
          {nome:'Impostos estimados', valor:r.pj.impostosPJ, pos:false},
          {nome:'Líquido antes do INSS', valor:r.pj.liquidoPJBruto, pos:false},
          ...(r.pj.inssAuto>0?[{nome:'INSS autônomo (11% do SM)', valor:r.pj.inssAuto, pos:false}]:[]),
          {nome:'Líquido PJ final', valor:r.pj.liquidoPJ, pos:false},
        ]},
        {titulo:'Resultado', linhas:[
          {nome:r.pjVantagem?'PJ rende a mais por mês':'CLT rende a mais por mês', valor:Math.abs(r.diferenca), pos:r.pjVantagem},
          {nome:'Salário CLT que equivale ao PJ (bruto)', valor:r.brutoEquivalenteCLT, pos:false},
        ]},
      ];
      const avisos=[
        {tipo:'info', txt:`Sem o FGTS (que você perde como PJ), precisaria acumular ${BRL(r.clt.fgts)} por mês de forma autônoma para ter reserva equivalente.`},
        {tipo:'warn', txt:'Como PJ, não há seguro-desemprego, aviso prévio, 13º garantido ou proteção da CLT. Inclua isso na negociação.'},
      ];
      if(v.regimePJ==='mei') avisos.push({tipo:'warn', txt:'MEI paga valor fixo mensal (DAS-MEI ≈ R$ 80,90 em 2026). O cálculo acima usa esse valor fixo independente do faturamento. Acima de R$ 6.750/mês, o MEI não se aplica (teto anual de R$ 81.000).'});
      if(!v.inssAutoVoluntario) avisos.push({tipo:'warn', txt:'Sem contribuir para o INSS, você perde direito a auxílio-doença, aposentadoria e outros benefícios previdenciários.'});
      const memoria=[
        `CLT — INSS: ${BRL(r.clt.inss.valor)}, IRRF: ${BRL(r.clt.irrf.valor)}, líquido: ${BRL(r.clt.liquido)}.`,
        `CLT — Benefícios: FGTS ${BRL(r.clt.fgts)} + férias/13º ${BRL(r.clt.ferias13)} = ${BRL(r.clt.fgts+r.clt.ferias13)} por mês.`,
        `PJ — Impostos (${PCT(r.pj.aliqPJ*100)}): ${BRL(r.pj.impostosPJ)} → líquido: ${BRL(r.pj.liquidoPJBruto)}.`,
        r.pj.inssAuto>0?`PJ — INSS autônomo: 11% × SM (${BRL(SALARIO_MINIMO)}) = ${BRL(r.pj.inssAuto)}.`:'',
        `Diferença: ${BRL(Math.abs(r.diferenca))} a favor do ${r.pjVantagem?'PJ':'CLT'} por mês.`,
        `Para "zerar" o PJ, o CLT equivalente seria de ${BRL(r.brutoEquivalenteCLT)} bruto.`,
      ].filter(Boolean);
      return { proventos:[], descontos:[], blocos, destaque:{label:r.pjVantagem?'PJ vantagem':'CLT vantagem', sub:`${BRL(Math.abs(r.diferenca))}/mês`, valor:r.pj.liquidoPJ}, memoria, avisos };
    }
  },

  auxilio:{
    nome:'Auxílio-doença', icone:ic.auxilio,
    titulo:'Auxílio-doença (INSS)', demoTit:'Benefício de afastamento',
    desc:'Estimativa do benefício por incapacidade temporária (B31), com os 15 dias pelo empregador e o restante pelo INSS.',
    campos:[
      {id:'salarioBruto', tipo:'moeda', rot:'Salário bruto mensal', def:''},
      {id:'afastamento', tipo:'numero', rot:'Dias de afastamento total', def:'30', min:1, dica:'primeiros 15 = empregador'},
      {id:'mesesContrib', tipo:'numero', rot:'Meses de contribuição ao INSS', def:'12', min:0, dica:'mín. 12 para B31'},
    ],
    calcular(v){
      if(v.salarioBruto<=0) return {vazio:true};
      if(v.mesesContrib < 12) return { erro:'São necessárias pelo menos 12 contribuições ao INSS para ter direito ao auxílio-doença (B31).' };
      const r = auxilioDoenca({ salarioBruto:v.salarioBruto, mesesContrib:v.mesesContrib, afastamento:v.afastamento });
      const blocos=[{titulo:'Composição do período', linhas:[
        {nome:`Primeiros 15 dias (empregador) — ${Math.min(15,r.afastamento)} dias`, valor:r.valorEmpregador, pos:true},
        ...(r.diasINSS>0?[{nome:`A partir do 16º dia (INSS) — ${r.diasINSS} dias`, valor:r.valorINSS, pos:true}]:[]),
      ]}];
      const memoria=[
        `Salário-de-benefício: limitado ao teto do INSS (${BRL(INSS_TETO)}) → ${BRL(r.salBeneficio)}.`,
        `Coeficiente B31 = 91% → benefício diário: ${BRL(r.valorBenef)} ÷ 30 = ${BRL(r.valorBenef/30)}.`,
        `Empregador: primeiros 15 dias = ${BRL(v.salarioBruto)} ÷ 30 × 15 = ${BRL(r.valorEmpregador)}.`,
        r.diasINSS>0?`INSS: ${r.diasINSS} dias × ${BRL(r.valorBenef/30)}/dia = ${BRL(r.valorINSS)}.`:'Menos de 15 dias — tudo pelo empregador.',
      ].filter(Boolean);
      const total = r2(r.valorEmpregador + r.valorINSS);
      return { proventos:[], descontos:[], blocos, destaque:{label:'Total do período', sub:`${r.afastamento} dias de afastamento`, valor:total}, memoria, avisos:[{tipo:'warn', txt:'Cálculo simplificado baseado no último salário. O INSS calcula pelo salário-de-benefício real (média dos 80% maiores salários de contribuição). Consulte o INSS para um valor preciso.'}] };
    }
  },

  maternidade:{
    nome:'Maternidade', icone:ic.maternidade,
    titulo:'Salário-maternidade', demoTit:'Licença-maternidade',
    desc:'Valor do salário-maternidade para CLT (120 dias, pago pelo empregador/INSS) com opção de 180 dias no Empresa Cidadã.',
    campos:[
      {id:'salarioBruto', tipo:'moeda', rot:'Salário bruto mensal', def:''},
      {id:'duracao', tipo:'select', rot:'Duração da licença', def:'120', opcoes:[
        {v:'120', t:'120 dias (padrão CLT)'},
        {v:'180', t:'180 dias (Empresa Cidadã / servidor público)'},
      ]},
      {id:'deps', tipo:'numero', rot:'Dependentes p/ IR', def:'0', min:0, max:20, meia:true},
    ],
    calcular(v){
      if(v.salarioBruto<=0) return {vazio:true};
      const r = salarioMaternidade({ salarioBruto:v.salarioBruto, deps:v.deps, duracao:Number(v.duracao)||120 });
      const proventos=[{nome:`Salário integral por ${r.duracao} dias (${r.periodos} meses)`, valor:r.valorMensal}];
      const descontos=[];
      if(r.inss.valor>0) descontos.push({nome:`INSS (${PCT(r.inss.aliqEfetiva)} efetivo)`, valor:r.inss.valor});
      if(r.irrf.valor>0) descontos.push({nome:`IRRF (${PCT(r.irrf.aliq*100)})`, valor:r.irrf.valor});
      const memoria=[
        `Valor mensal integral: ${BRL(r.valorMensal)} (salário CLT mantido durante toda a licença).`,
        `Duração: ${r.duracao} dias = ${r.periodos} parcelas mensais.`,
        memINSS(r.valorMensal, r.inss), memIRRF(r.irrf),
      ];
      return { proventos, descontos, destaque:{label:'Total líquido da licença', sub:`${r.duracao} dias`, valor:r.totalLiquido}, memoria, avisos:[{tipo:'info', txt:'Para CLT: o empregador paga o salário integral e é reembolsado pelo INSS (até o teto). Se o salário superar o teto, o excedente é por conta do empregador.'}] };
    }
  },

  ir:{
    nome:'IR anual', icone:ic.ir,
    titulo:'Simulador de IR anual', demoTit:'Declaração estimada',
    desc:'Simule o imposto de renda da declaração 2027 (ano-calendário 2026): escolha entre declaração simplificada ou completa.',
    campos:[
      {id:'rendTrib', tipo:'moeda', rot:'Rendimentos tributáveis anuais', def:'', dica:'salários, aluguéis, etc.'},
      {id:'inssAnual', tipo:'moeda', rot:'INSS pago no ano', def:'', meia:true, dica:'ou informe 0'},
      {id:'irrfRetidoFonte', tipo:'moeda', rot:'IRRF retido na fonte', def:'', meia:true, dica:'conforme informe de rendimentos'},
      {id:'deps', tipo:'numero', rot:'Dependentes', def:'0', min:0, max:20, meia:true},
      {id:'pensao', tipo:'moeda', rot:'Pensão alimentícia paga', def:'', meia:true},
      {id:'despMed', tipo:'moeda', rot:'Despesas médicas', def:'', dica:'sem limite'},
      {id:'despEduc', tipo:'moeda', rot:'Despesas com educação', def:'', meia:true, dica:'limite R$ 3.561,50 por pessoa'},
      {id:'livrosCaixa', tipo:'moeda', rot:'Livro-caixa / aut. / contribuintes', def:'', meia:true},
    ],
    calcular(v){
      if(v.rendTrib<=0) return {vazio:true};
      const dedDeps = nz(v.deps) * IRRF_DEP_ANUAL;
      const despEducLim = Math.min(nz(v.despEduc), 3561.50 * Math.max(1, nz(v.deps)));
      const dedCompleta = r2(nz(v.inssAnual) + dedDeps + nz(v.pensao) + nz(v.despMed) + despEducLim + nz(v.livrosCaixa));
      const simpl = r2(Math.min(v.rendTrib * IRRF_SIMPL_PCT, IRRF_SIMPL_TETO));
      const baseCompleta = r2(Math.max(0, v.rendTrib - dedCompleta));
      const baseSimpl = r2(Math.max(0, v.rendTrib - simpl));
      const usouSimpl = baseSimpl < baseCompleta;
      const base = usouSimpl ? baseSimpl : baseCompleta;
      const faixa = IRRF_ANUAL_TAB.find(f=> base <= f.ate);
      const imposto = r2(Math.max(0, base * faixa.aliq - faixa.deduz));
      const irrfRetido = nz(v.irrfRetidoFonte);
      const diferenca = r2(imposto - irrfRetido);
      const aRestituir = diferenca < 0 ? r2(-diferenca) : 0;
      const aRecolher  = diferenca > 0 ? diferenca : 0;
      const blocos=[
        {titulo:`Forma de declaração: ${usouSimpl?'Simplificada (mais vantajosa)':'Completa (mais vantajosa)'}`, linhas:[
          {nome:'Desconto simplificado (20%, máx R$ 16.754,34)', valor:simpl, pos:false},
          {nome:'Deduções legais completas', valor:dedCompleta, pos:false},
          {nome:usouSimpl?'Usando simplificada':'Usando completa', valor:usouSimpl?simpl:dedCompleta, pos:true},
        ]},
        {titulo:'Apuração do imposto', linhas:[
          {nome:'Base de cálculo após deduções', valor:base, pos:false},
          {nome:`Alíquota ${PCT(faixa.aliq*100)}`, valor:imposto, pos:false},
          {nome:'IRRF retido na fonte', valor:irrfRetido, pos:false},
          {nome: diferenca>=0?'Imposto a recolher (DARF)':'Imposto a restituir', valor:Math.abs(diferenca), pos:diferenca<0},
        ]},
      ];
      const avisos=[];
      if(aRestituir>0) avisos.push({tipo:'info', txt:`Previsão de restituição: ${BRL(aRestituir)}. Prazo de entrega da declaração geralmente entre março e maio do ano seguinte.`});
      if(aRecolher>0)  avisos.push({tipo:'warn', txt:`Imposto a recolher: ${BRL(aRecolher)}. Pode ser parcelado em até 8 quotas iguais (mínimo R$ 50).`});
      if(!usouSimpl && nz(v.despMed)===0 && nz(v.despEduc)===0)
        avisos.push({tipo:'info', txt:'A declaração completa ficou mais vantajosa pela soma das deduções de dependentes, INSS e pensão. Registre despesas médicas e educação para otimizar ainda mais.'});
      const memoria=[
        `Rendimentos tributáveis: ${BRL(v.rendTrib)}.`,
        usouSimpl
          ? `Declaração simplificada: desconto de 20% = ${BRL(simpl)} (mais vantajosa que deduções de ${BRL(dedCompleta)}).`
          : `Declaração completa: deduções de ${BRL(dedCompleta)} (mais vantajosa que simplificada de ${BRL(simpl)}).`,
        nz(v.deps)>0?`Dedução por dependentes: ${v.deps} × ${BRL(IRRF_DEP_ANUAL)} = ${BRL(dedDeps)}.`:'',
        nz(v.despEduc)>0?`Educação: limitado a R$ 3.561,50 por pessoa = ${BRL(despEducLim)}.`:'',
        `Base de cálculo: ${BRL(base)} → ${PCT(faixa.aliq*100)} = imposto de ${BRL(imposto)}.`,
        `Retido na fonte: ${BRL(irrfRetido)} → ${diferenca>=0?`recolher ${BRL(aRecolher)}`:`restituir ${BRL(aRestituir)}`}.`,
      ].filter(Boolean);
      return { proventos:[], descontos:[], blocos, destaque:{label:diferenca>=0?'A recolher':'A restituir', sub:usouSimpl?'declaração simplificada':'declaração completa', valor:Math.abs(diferenca)}, memoria, avisos };
    }
  },
};

const ordem = ['liquido','rescisao','ferias','decimo','horas','noturno','seguro','pj','auxilio','maternidade','ir'];

// Export global namespace
window.RCEngine = {
  r2, nz, calcINSS, calcIRRF, calcRedutor, irrfTabela,
  salarioLiquido, decimoTerceiro, ferias, horasExtras,
  parseDate, diasNoMes, addDays, contarAvos, anosCompletos, ultimoAniversario,
  rescisao, folhaCompleta, seguroDesemprego, pjVsClt, auxilioDoenca, salarioMaternidade,
  BRL, PCT, memINSS, memIRRF,
  CALCS, ordem,
  SALARIO_MINIMO, INSS_TETO, MEI_DAS,
  INSS_TAB, IRRF_TAB, IRRF_DEPENDENTE, IRRF_SIMPLIFICADO,
  IRRF_ANUAL_TAB, IRRF_DEP_ANUAL, IRRF_SIMPL_PCT, IRRF_SIMPL_TETO,
  SF_TETO, SF_VALOR,
};
