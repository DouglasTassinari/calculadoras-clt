/* Jornada Brasil - motores puros das ferramentas de decisao. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JBDecisionTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round(value) {
    return Math.round((number(value) + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number(value));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, number(value)));
  }

  function estimateJob(input, engine) {
    if (!engine || typeof engine.salarioLiquido !== 'function') throw new Error('Motor trabalhista indisponível.');
    var job = input || {};
    var gross = Math.max(0, number(job.gross));
    var dependents = Math.max(0, Math.floor(number(job.dependents)));
    var monthlyBenefits = Math.max(0, number(job.monthlyBenefits));
    var healthBenefit = Math.max(0, number(job.healthBenefit));
    var annualBonus = Math.max(0, number(job.annualBonus));
    var monthlyCosts = Math.max(0, number(job.monthlyCosts));
    var weeklyHours = clamp(job.weeklyHours || 44, 1, 80);
    var officeDays = clamp(job.officeDays, 0, 7);
    var commuteMinutes = Math.max(0, number(job.commuteMinutes));
    var commuteCostPerDay = Math.max(0, number(job.commuteCostPerDay));
    var officeDaysMonth = officeDays * 52 / 12;
    var commuteCostMonth = officeDaysMonth * commuteCostPerDay;
    var commuteHoursMonth = officeDaysMonth * commuteMinutes / 60;
    var salary = engine.salarioLiquido({ bruto: gross, deps: dependents, outrosDescontos: 0, pensao: 0 });
    var thirteenth = engine.decimoTerceiro({ bruto: gross, meses: 12, deps: dependents });
    var vacation = engine.ferias({ bruto: gross, dias: 30, venderDias: 0, deps: dependents });
    var vacationExtra = Math.max(0, vacation.liquido - salary.liquido);
    var cashAnnual = salary.liquido * 12 + thirteenth.liquidoTotal + vacationExtra
      + (monthlyBenefits + healthBenefit - monthlyCosts - commuteCostMonth) * 12 + annualBonus;
    var fgtsAnnual = gross * (12 + 1 + 1 / 3) * 0.08;
    var economicAnnual = cashAnnual + fgtsAnnual;
    var committedHoursMonth = weeklyHours * 52 / 12 + commuteHoursMonth;
    return {
      gross: round(gross), netSalary: round(salary.liquido), inss: round(salary.inss.valor), irrf: round(salary.irrf.valor),
      thirteenthNet: round(thirteenth.liquidoTotal), vacationExtra: round(vacationExtra),
      benefitsMonth: round(monthlyBenefits + healthBenefit), annualBonus: round(annualBonus),
      commuteCostMonth: round(commuteCostMonth), commuteHoursMonth: round(commuteHoursMonth),
      cashAnnual: round(cashAnnual), fgtsAnnual: round(fgtsAnnual), economicAnnual: round(economicAnnual),
      monthlyEquivalent: round(economicAnnual / 12), committedHoursMonth: round(committedHoursMonth),
      effectiveHourly: round(committedHoursMonth > 0 ? (economicAnnual / 12) / committedHoursMonth : 0)
    };
  }

  function breakEvenGross(targetAnnual, offerInput, engine) {
    var target = Math.max(0, number(targetAnnual));
    if (estimateJob(Object.assign({}, offerInput, { gross: 0 }), engine).economicAnnual >= target) return 0;
    var low = 0;
    var high = 250000;
    if (estimateJob(Object.assign({}, offerInput, { gross: high }), engine).economicAnnual < target) return null;
    for (var i = 0; i < 70; i += 1) {
      var middle = (low + high) / 2;
      var value = estimateJob(Object.assign({}, offerInput, { gross: middle }), engine).economicAnnual;
      if (value >= target) high = middle;
      else low = middle;
    }
    return round(high);
  }

  function compareProposals(currentInput, offerInput, engine) {
    if (number(currentInput && currentInput.gross) <= 0 || number(offerInput && offerInput.gross) <= 0) {
      return { error: 'Informe o salário bruto dos dois empregos.' };
    }
    var current = estimateJob(currentInput, engine);
    var offer = estimateJob(offerInput, engine);
    var annualDifference = round(offer.economicAnnual - current.economicAnnual);
    var hourlyDifference = round(offer.effectiveHourly - current.effectiveHourly);
    var commuteDifferenceYear = round((offer.commuteHoursMonth - current.commuteHoursMonth) * 12);
    var actions = [];
    actions.push(annualDifference >= 0
      ? 'A nova proposta aumenta o valor econômico anual em ' + formatCurrency(annualDifference) + '.'
      : 'A nova proposta reduz o valor econômico anual em ' + formatCurrency(Math.abs(annualDifference)) + '.');
    if (hourlyDifference < 0) actions.push('Mesmo com a remuneração total, o valor por hora comprometida cai na nova rotina.');
    if (commuteDifferenceYear > 0) actions.push('A troca acrescenta cerca de ' + Math.round(commuteDifferenceYear) + ' horas de deslocamento por ano.');
    if (number(offerInput.annualBonus) > offer.gross * 2) actions.push('Uma parcela relevante depende de bônus: confirme regra, histórico de pagamento e condição de elegibilidade.');
    if (offer.commuteCostMonth > current.commuteCostMonth) actions.push('Negocie vale-transporte, estacionamento ou ajuda de custo antes de decidir.');
    actions.push('Confirme por escrito jornada, modelo presencial, benefícios, período de experiência e critérios da remuneração variável.');
    return {
      current: current, offer: offer, annualDifference: annualDifference, monthlyDifference: round(annualDifference / 12),
      hourlyDifference: hourlyDifference, commuteDifferenceYear: commuteDifferenceYear,
      breakEvenGross: breakEvenGross(current.economicAnnual, offerInput, engine),
      winner: annualDifference > 120 ? 'offer' : (annualDifference < -120 ? 'current' : 'tie'), actions: actions
    };
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    var parts = value.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function addDays(date, days) {
    var next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }
  function iso(date) {
    if (!date) return '';
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function right(label, status, detail) { return { label: label, status: status, detail: detail }; }

  function dismissalGuide(input) {
    var data = input || {};
    var reason = data.reason || 'without_cause';
    var endDate = parseDate(data.endDate);
    var paymentDue = endDate ? addDays(endDate, 10) : null;
    var insuranceStart = endDate ? addDays(endDate, 7) : null;
    var insuranceEnd = endDate ? addDays(endDate, 120) : null;
    var birthdayWithdrawal = data.fgtsMode === 'birthday';
    var request = data.insuranceRequest || 'first';
    var monthsRequired = request === 'first' ? 12 : (request === 'second' ? 9 : 6);
    var rights = [];
    var warnings = [];
    var title = '';
    var insurance = false;
    if (reason === 'without_cause') {
      title = 'Dispensa sem justa causa'; insurance = true;
      rights = [right('Saldo de salário', 'yes', 'Dias trabalhados no mês da saída.'),
        right('Aviso prévio', 'yes', 'Trabalhado ou indenizado, com proporcionalidade conforme o tempo de serviço.'),
        right('13º proporcional', 'yes', 'Conta mês ou fração igual ou superior a 15 dias.'),
        right('Férias vencidas e proporcionais + 1/3', 'yes', 'Inclua períodos vencidos, quando existirem.'),
        right('Multa de 40% do FGTS', 'yes', 'Calculada sobre os depósitos devidos durante o contrato.'),
        right('Saque do saldo do FGTS', birthdayWithdrawal ? 'depends' : 'yes', birthdayWithdrawal ? 'No Saque-Aniversário, em regra o saldo integral fica bloqueado; a multa rescisória continua devida.' : 'Disponível na modalidade Saque-Rescisão.'),
        right('Seguro-desemprego', 'depends', 'Depende dos meses trabalhados, da solicitação e dos demais requisitos do programa.')];
    } else if (reason === 'resignation') {
      title = 'Pedido de demissão';
      rights = [right('Saldo de salário', 'yes', 'Dias trabalhados no mês da saída.'),
        right('13º proporcional', 'yes', 'Conta mês ou fração igual ou superior a 15 dias.'),
        right('Férias vencidas e proporcionais + 1/3', 'yes', 'Inclua períodos vencidos, quando existirem.'),
        right('Aviso prévio', 'depends', 'Se não for cumprido e não houver dispensa pelo empregador, o período faltante pode ser descontado.'),
        right('Multa e saque do FGTS', 'no', 'O pedido de demissão não libera multa rescisória nem saque por esse motivo.'),
        right('Seguro-desemprego', 'no', 'Não é devido no pedido de demissão.')];
      warnings.push('Peça por escrito a dispensa do cumprimento do aviso se houver acordo com a empresa.');
    } else if (reason === 'agreement') {
      title = 'Extinção por acordo';
      rights = [right('Saldo de salário', 'yes', 'Dias trabalhados no mês da saída.'),
        right('13º e férias proporcionais + 1/3', 'yes', 'Pagos integralmente conforme os avos.'),
        right('Aviso prévio indenizado', 'depends', 'Quando indenizado, é pago pela metade.'),
        right('Multa de 20% do FGTS', 'yes', 'Metade da indenização de uma dispensa sem justa causa.'),
        right('Saque de até 80% do FGTS', birthdayWithdrawal ? 'depends' : 'yes', birthdayWithdrawal ? 'O Saque-Aniversário pode limitar a movimentação; confira no app FGTS.' : 'Limite legal da rescisão por acordo.'),
        right('Seguro-desemprego', 'no', 'A extinção por acordo não autoriza o benefício.')];
    } else if (reason === 'for_cause') {
      title = 'Dispensa por justa causa';
      rights = [right('Saldo de salário', 'yes', 'Dias efetivamente trabalhados no mês.'),
        right('Férias vencidas + 1/3', 'yes', 'Períodos já adquiridos continuam devidos.'),
        right('13º e férias proporcionais', 'no', 'Em regra, não são pagos na justa causa.'),
        right('Aviso prévio', 'no', 'Não é devido.'), right('Multa e saque do FGTS', 'no', 'A justa causa não libera a multa nem o saque rescisório.'),
        right('Seguro-desemprego', 'no', 'Não é devido.')];
      warnings.push('A validade da justa causa depende de fatos e provas. Se houver dúvida sobre o motivo ou o procedimento, procure o sindicato ou assistência jurídica.');
    } else {
      title = 'Término de contrato por prazo determinado';
      rights = [right('Saldo de salário', 'yes', 'Dias trabalhados no mês.'),
        right('13º e férias proporcionais + 1/3', 'yes', 'Conforme os meses trabalhados.'),
        right('Saque do FGTS', birthdayWithdrawal ? 'depends' : 'yes', birthdayWithdrawal ? 'O Saque-Aniversário pode limitar a movimentação; confira no app FGTS.' : 'O término normal do contrato permite saque do FGTS.'),
        right('Multa de 40% do FGTS', 'no', 'Não é devida no término normal na data combinada.'),
        right('Aviso prévio', 'no', 'Não se aplica ao término normal na data prevista.'),
        right('Seguro-desemprego', 'depends', 'Consulte o canal oficial: a elegibilidade depende da forma do desligamento e dos requisitos do programa.')];
      warnings.push('Se o contrato terminou antes da data prevista, podem existir indenizações específicas dos arts. 479 e 480 da CLT.');
    }
    var documents = ['Termo de Rescisão do Contrato de Trabalho (TRCT) com as rubricas discriminadas.',
      'Comprovante do pagamento e demonstrativo das verbas rescisórias.', 'Baixa do vínculo na Carteira de Trabalho Digital.',
      'Extrato do FGTS e comprovante da multa, quando houver.', 'Exame demissional, quando exigível pelo programa de saúde ocupacional.'];
    if (insurance) documents.push('Número do Requerimento do Seguro-Desemprego fornecido pelo empregador.');
    var timeline = [{ label: 'Pagamento da rescisão', date: iso(paymentDue), detail: paymentDue ? 'Prazo máximo estimado: 10 dias corridos após o término do contrato.' : 'Informe a data final para calcular o limite de 10 dias corridos.' },
      { label: 'Conferência do FGTS e da CTPS Digital', date: '', detail: 'Confira assim que os documentos forem entregues e guarde cópias.' }];
    if (insurance) timeline.push({ label: 'Janela do seguro-desemprego', date: iso(insuranceStart), endDate: iso(insuranceEnd), detail: 'Trabalhador formal: do 7º ao 120º dia, se cumprir os demais requisitos.' });
    return { title: title, rights: rights, documents: documents, timeline: timeline, warnings: warnings,
      monthsRequired: insurance ? monthsRequired : null, insuranceEligibleReason: insurance,
      nextSteps: ['Compare o TRCT com holerites, férias já gozadas, adiantamentos e extrato do FGTS.',
        'Peça correção por escrito se faltar uma verba ou se a data estiver errada.',
        'Use a calculadora de rescisão para obter uma estimativa e conferir a memória de cálculo.',
        'Procure sindicato, advogado trabalhista ou atendimento público quando houver divergência relevante.'] };
  }

  return { estimateJob: estimateJob, compareProposals: compareProposals, dismissalGuide: dismissalGuide, breakEvenGross: breakEvenGross };
});
