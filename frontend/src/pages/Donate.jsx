function renderButtons() {
  if (buttonsRenderedRef.current || !paypalContainerRef.current || !window.paypal) return;
  buttonsRenderedRef.current = true;

  const createOrder = async () => {
    setError("");
    const amt = Number(amountRef.current);
    if (isNaN(amt) || amt < 5) {
      setError("Minimum donation is $5.00");
      throw new Error("Invalid amount");
    }
    const { data } = await api.post("/donate/create", {
      campaign_id: id,
      amount: amt,
      donor_name: donorNameRef.current || "Anonymous",
    });
    return data.order_id;
  };

  const onApprove = async (data) => {
    setSubmitting(true);
    setError("");
    try {
      const { data: capData } = await api.post("/donate/capture", { order_id: data.orderID });
      setResult(capData);
    } catch (err) {
      setError(formatApiError(err));
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onError = () => {
    setError("Something went wrong with checkout. Please try again.");
  };

  // Default PayPal button (PayPal account login)
  window.paypal.Buttons({
    fundingSource: window.paypal.FUNDING.PAYPAL,
    style: { layout: "vertical", color: "blue", shape: "rect", label: "pay" },
    createOrder,
    onApprove,
    onError,
  }).render(paypalContainerRef.current);

  // Explicit card button — force render regardless of PayPal's automatic eligibility guess
  const cardButtons = window.paypal.Buttons({
    fundingSource: window.paypal.FUNDING.CARD,
    style: { layout: "vertical", color: "black", shape: "rect", label: "pay" },
    createOrder,
    onApprove,
    onError,
  });

  if (cardButtons.isEligible()) {
    cardButtons.render(paypalContainerRef.current);
  } else {
    console.log("PayPal reports this browser/account is NOT eligible for card button");
  }
}