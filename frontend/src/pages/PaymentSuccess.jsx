import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Download,PartyPopper } from "lucide-react";
import jsPDF from "jspdf";
import "../styles/PaymentSuccess.css";
import { useTranslation } from "react-i18next";


export default function PaymentSuccess() {
const { t } = useTranslation(); // ✅ yaha hona chahiye
const location = useLocation();
const navigate = useNavigate();
const [downloading,setDownloading] = useState(false);
const formatCurrency = (amount) => {
  const value = Number(amount || 0).toFixed(2);



  if (currency === "INR") {
    return `Rs. ${value}`;
  } else {
    return `$ ${value}`;
  }
};
const { transactionId, plan, planId, total, currency, name, email, billingCycle, discount,originalPrice, tax } = location.state || {};

const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("accessToken");

useEffect(()=>{

const activatePlan = async () => {

try{

const response = await fetch("http://localhost:5000/api/auth/update-plan",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${token}`
},
body: JSON.stringify({
userId:user?.id,
plan: planId || (plan && typeof plan === 'string' ? plan.replace(/ plan/i, "").trim().toLowerCase() : "basic"),
billingCycle
})
});

if (response.ok) {
  const data = await response.json();
  if (user) {
    user.plan = data.plan;
    localStorage.setItem("user", JSON.stringify(user));
  }
}



}catch(err){
console.log(err);
}

};

activatePlan();

},[]);


const downloadInvoice = () => {

if (downloading) return;

setDownloading(true);

// React ko render karne ka time dene ke liye
setTimeout(()=>{

try {

const doc = new jsPDF();

const invoiceNumber = "INV-" + Math.floor(100 + Math.random() * 900);
const date = new Date().toLocaleDateString();

const headerImg = "/invoice-header.png";
const watermarkImg = "/watermark.jpg";
const footerImg = "/footer.jpeg";

const basePrice = Number(originalPrice || 0);
const discountAmount = Number(discount || 0);

const taxAmount = basePrice * 0.18;
const finalTotal = basePrice + taxAmount - discountAmount;

const currencySymbol = currency === "INR" ? "Rs." : "$";

doc.addImage(headerImg,"PNG",0,0,210,50);

doc.setGState(new doc.GState({ opacity: 0.05 }));
doc.addImage(watermarkImg,"JPG",55,90,100,100);
doc.setGState(new doc.GState({ opacity: 1 }));

doc.setFont("helvetica","bold");
doc.setFontSize(18);
doc.text("INVOICE",20,59);

doc.setFontSize(11);
doc.setFont("helvetica","bold");

doc.text("Invoice Number:",20,75);
doc.text("Transaction ID:",20,85);
doc.text("Date:",20,95);

doc.setFont("helvetica","normal");

doc.text(invoiceNumber,70,75);
doc.text(transactionId || "N/A",70,85);
doc.text(date,70,95);

doc.setDrawColor(200);
doc.line(20,105,190,105);

doc.setFontSize(13);
doc.setFont("helvetica","bold");
doc.text("Customer Details",20,120);

doc.setFontSize(11);
doc.setFont("helvetica","normal");

doc.text(`Name: ${name || "CareerPilot User"}`,20,132);
doc.text(`Email: ${email || "user@email.com"}`,20,142);

doc.setFont("helvetica","bold");
doc.text("Plan Details",20,160);

doc.setFont("helvetica","normal");

doc.text(`Plan Name: ${plan}`,20,172);

const cycle = (billingCycle || "").toLowerCase();
const billingText = cycle === "quarterly" ? "Quarterly" : "Monthly";
const billingPeriod = cycle === "quarterly" ? "3 Months" : "1 Month";

doc.text(`Billing Cycle: ${billingText}`,20,182);
doc.text(`Billing Period: ${billingPeriod}`,20,192);

doc.setFont("helvetica","bold");
doc.text("Payment Details",20,215);

doc.setFont("helvetica","normal");

doc.text("Payment Method: Online Payment",20,227);
doc.text("Payment Status: Successful",20,237);

doc.setDrawColor(220);
doc.line(110,115,110,230);

doc.setFontSize(13);
doc.setFont("helvetica","bold");
doc.text("Order Summary",120,120);

doc.setFillColor(36,64,102);
doc.rect(120,130,70,10,"F");

doc.setTextColor(255,255,255);
doc.setFontSize(11);

doc.text("Subscription Plan",125,137);
doc.text(`${currencySymbol} ${basePrice.toFixed(2)}`,185,137,null,null,"right");

doc.setTextColor(0,0,0);

doc.rect(120,140,70,10);
doc.text("Tax (GST 18%)",125,147);
doc.text(`${currencySymbol} ${taxAmount.toFixed(2)}`,185,147,null,null,"right");

doc.rect(120,150,70,10);
doc.text("Discount",125,157);
doc.text(`- ${currencySymbol} ${discountAmount.toFixed(2)}`,185,157,null,null,"right");

doc.setFont("helvetica","bold");
doc.setFontSize(12);

doc.text("Total Paid",125,170);
doc.text(`${currencySymbol} ${finalTotal.toFixed(2)}`,185,170,null,null,"right");

doc.addImage(footerImg,"JPEG",0,270,210,30);

doc.save(`CareerPilot-Invoice-${invoiceNumber}.pdf`);

} catch (err) {

console.error(err);
alert(t("paymentSuccess.invoice_error"));

}

setDownloading(false);

},100);

};
return (

<div className="success-page">

<div className="success-card">

<div className="success-icon">
<CheckCircle size={40}/>
</div>

<h1>{t("paymentSuccess.title")}</h1>

<p>{t("paymentSuccess.subtitle")}</p>

<div className="success-details">

<p><strong>{t("paymentSuccess.transaction")}:</strong> {transactionId}</p>
<p><strong>{t("paymentSuccess.plan")}:</strong> {plan}</p>
<p><strong>{t("paymentSuccess.amount")}:</strong> {formatCurrency(total)}</p>

</div>

<div className="success-buttons">

<button
className="invoice-btn"
onClick={downloadInvoice}
disabled={downloading}
>
{downloading ? (
  t("paymentSuccess.generating")
) : (
  <>
    <Download size={16}/>
    {t("paymentSuccess.download")}
  </>
)}
</button>

<button
className="dashboard-btn"
onClick={()=>navigate("/dashboard")}
>
{t("paymentSuccess.dashboard")}
</button>

</div>

</div>

</div>

);

}