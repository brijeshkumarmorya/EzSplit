// Split calculation
export function calculateSplits(totalAmount, splitType, participants) {
  if (!["equal", "percentage", "custom"].includes(splitType)) {
    throw new Error("Invalid splitType");
  }

  if (splitType === "equal") {
    const n = participants.length;
    if (n === 0) throw new Error("No participants for equal split");
    const rawShare = totalAmount / n;
    const share = Math.round(rawShare * 100) / 100;
    const remainder = Math.round((totalAmount - share * n) * 100) / 100;

    return participants.map((u, idx) => ({
      user: typeof u === "string" ? u : u.user,
      finalShare: Math.round((share + (idx === 0 ? remainder : 0)) * 100) / 100,
    }));
  }

  if (splitType === "percentage") {
    const totalPercent = participants.reduce((s, p) => s + (p.percentage || 0), 0);
    if (Math.round(totalPercent * 100) / 100 !== 100) {
      throw new Error("Percentages must add up to 100");
    }
    return participants.map((p) => ({
      user: p.user,
      percentage: p.percentage,
      finalShare: Math.round((totalAmount * (p.percentage / 100)) * 100) / 100,
    }));
  }

  if (splitType === "custom") {
    const totalCustom = participants.reduce((s, p) => s + (p.amount || 0), 0);
    if (Math.round(totalCustom * 100) / 100 !== Math.round(totalAmount * 100) / 100) {
      throw new Error("Custom amounts must add up to the total amount");
    }
    return participants.map((p) => ({
      user: p.user,
      amount: p.amount,
      finalShare: Math.round(p.amount * 100) / 100,
    }));
  }
}

// Net balance for a single expense
export function computeNetBalances(expense) {
  const balances = {};
  expense.splitDetails.forEach((d) => (balances[d.user.toString()] = 0));

  expense.splitDetails.forEach((d) => {
    balances[d.user.toString()] -= Number(d.finalShare);
  });

  balances[expense.paidBy.toString()] =
    (balances[expense.paidBy.toString()] || 0) + Number(expense.amount);

  Object.keys(balances).forEach(
    (k) => (balances[k] = Math.round(balances[k] * 100) / 100)
  );
  return balances;
}

// Compute settlement (minimal transfers)
export function computeSettlement(balances) {
  const debtors = [];
  const creditors = [];

  for (const [user, bal] of Object.entries(balances)) {
    const amt = Math.round(bal * 100) / 100;
    if (amt < -0.009) debtors.push({ user, amount: -amt });
    else if (amt > 0.009) creditors.push({ user, amount: amt });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    transfers.push({
      from: debtor.user,
      to: creditor.user,
      amount: Math.round(transferAmount * 100) / 100,
    });

    debtor.amount = Math.round((debtor.amount - transferAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - transferAmount) * 100) / 100;

    if (debtor.amount <= 0.009) i++;
    if (creditor.amount <= 0.009) j++;
  }

  return transfers;
}
