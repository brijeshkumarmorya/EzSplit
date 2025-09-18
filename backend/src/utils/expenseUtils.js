// Split calculation with integer precision (no float errors)
export function calculateSplits(totalAmount, splitType, participants) {
  if (!["equal", "percentage", "custom"].includes(splitType)) {
    throw new Error("Invalid splitType");
  }

  const totalPaise = Math.round(totalAmount * 100); // convert ₹ → paise

  if (splitType === "equal") {
    const n = participants.length;
    if (n === 0) throw new Error("No participants for equal split");

    const baseShare = Math.floor(totalPaise / n);
    let remainder = totalPaise - baseShare * n;

    return participants.map((u, idx) => {
      let sharePaise = baseShare;
      if (remainder > 0) {
        sharePaise += 1; // distribute leftover paise one by one
        remainder--;
      }
      return {
        user: typeof u === "string" ? u : u.user,
        finalShare: sharePaise / 100, // back to rupees
      };
    });
  }

  if (splitType === "percentage") {
    const totalPercent = participants.reduce((s, p) => s + (p.percentage || 0), 0);
    if (Math.round(totalPercent * 100) !== 10000) { // must equal 100.00
      throw new Error("Percentages must add up to 100");
    }

    let allocated = 0;
    const results = participants.map((p, idx) => {
      let sharePaise = Math.floor((totalPaise * p.percentage) / 100);
      allocated += sharePaise;
      return { user: p.user, percentage: p.percentage, _paise: sharePaise };
    });

    let remainder = totalPaise - allocated;
    for (let i = 0; remainder > 0 && i < results.length; i++, remainder--) {
      results[i]._paise++;
    }

    return results.map((r) => ({
      user: r.user,
      percentage: r.percentage,
      finalShare: r._paise / 100,
    }));
  }

  if (splitType === "custom") {
    const totalCustom = participants.reduce((s, p) => s + (p.amount || 0), 0);
    if (Math.round(totalCustom * 100) !== totalPaise) {
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
    balances[d.user.toString()] -= Math.round(d.finalShare * 100);
  });

  balances[expense.paidBy.toString()] =
    (balances[expense.paidBy.toString()] || 0) + Math.round(expense.amount * 100);

  Object.keys(balances).forEach(
    (k) => (balances[k] = balances[k] / 100) // back to rupees
  );
  return balances;
}

// Compute settlement (minimal transfers)
export function computeSettlement(balances) {
  const debtors = [];
  const creditors = [];

  for (const [user, bal] of Object.entries(balances)) {
    const amt = Math.round(bal * 100); // paise
    if (amt < 0) debtors.push({ user, amount: -amt });
    else if (amt > 0) creditors.push({ user, amount: amt });
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
      amount: transferAmount / 100, // rupees
    });

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transfers;
}
