import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
CreditCard,
Smartphone,
Landmark,
User,
ShieldCheck,
Check
} from "lucide-react";

import "../styles/PaymentPage.css";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
export default function PaymentPage() {


const navigate = useNavigate();
const { t } = useTranslation();
const location = useLocation();
const { plan, price, billingCycle, currency } = location.state || {};
const total = Number(price);

const [coupon,setCoupon] = useState("");
const [discount,setDiscount] = useState(0);
const [couponMessage,setCouponMessage] = useState("");
const [couponSuccess,setCouponSuccess] = useState(false);

const subtotal = Math.max(total - discount, 0);
const tax = subtotal * 0.05;
const finalPrice = subtotal + tax;

const [method,setMethod] = useState("card");
const [loading,setLoading] = useState(false);
// PaymentPage.jsx ke top me
const symbol = currency === "INR" ? "₹" : "$";
const user = JSON.parse(localStorage.getItem("user"));
const [cardName,setCardName] = useState("");
const [cardNumber,setCardNumber] = useState("");
const [expiry,setExpiry] = useState("");
const [cvv,setCvv] = useState("");

const [upi,setUpi] = useState("");
const [bank,setBank] = useState("");

const formatCardNumber = (value) => {
return value
.replace(/\D/g,"")        // sirf numbers allow
.replace(/(.{4})/g,"$1 ") // 4 digit ke baad space
.trim();
};

const formatExpiry = (value) => {
return value
.replace(/\D/g,"")
.replace(/(\d{2})(\d)/,"$1/$2")
.substring(0,5);
};
const applyCoupon = () => {

if(coupon === "CAREER50"){
  setDiscount(total * 0.5);
  setCouponMessage(t("payment.coupon_50"));
  setCouponSuccess(true);
  toast.success(t("payment.coupon_50"));
}

else if(coupon === "CAREER20"){
  setDiscount(total * 0.2);
  setCouponMessage(t("payment.coupon_20"));
  setCouponSuccess(true);
  toast.success(t("payment.coupon_20"));
}

else{
  setCouponMessage(t("payment.invalid_coupon"));
  setCouponSuccess(false);
  toast.error(t("payment.invalid_coupon"));
}

};


const transactionId = "CPAY" + Math.floor(Math.random()*1000000);

/* PLAN DATA */

const planData = {
  basic:{
    name: t("basic_plan"),
    features:[
      t("ai_career_chatbot"),
      t("basic_career_assessment"),
      t("college_database_access"),
      t("email_support")
    ]
  },

  premium:{
    name: t("premium_plan"),
    features:[
      t("everything_in_basic"),
      t("ai_roadmap_generator"),
      t("unlimited_roadmaps"),
      t("priority_support")
    ]
  },

  elite:{
    name: t("elite_plan"),
    features:[
      t("everything_in_premium"),
      t("chatgpt_gemini_pro"),
      t("brock_ai_assistant"),
      t("support_247")
    ]
  }
};

const selectedPlan = planData[plan] || planData.basic;

const handlePayment = () => {

if(method === "card"){
  if(!cardName || !cardNumber || !expiry || !cvv){
    toast.error(t("payment.fill_card"));
    return;
  }
}

if(method === "upi"){

  const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;

  if(!upi){
    toast.error(t("payment.enter_upi"));
    return;
  }

  if(!upiRegex.test(upi)){
    toast.error(t("payment.invalid_upi"));
    return;
  }
}

if(method === "bank"){
  if(!bank || bank === "Select Bank"){
    toast.error(t("payment.select_bank_error"));
    return;
  }
}

setLoading(true);

setTimeout(()=>{

  toast.success("Payment Successful 🎉"); // ✅ working

  const transactionId = "CPAY" + Math.floor(Math.random()*1000000);

  navigate("/payment-success",{
    state:{
      transactionId,
      plan:selectedPlan.name,
      planId: plan,
      total:finalPrice.toFixed(2),
      originalPrice: total,
      discount,
      tax,
      currency,
      billingCycle,
      name:user?.name,
      email:user?.email
    }
  });

},2000);

};

return (

<div className="payment-page">

<h1 className="payment-title">
 {t("payment.title")}
</h1>

<div className="payment-grid">

{/* LEFT PAYMENT SECTION */}

<div className="payment-card">

<h3>{t("payment.method")}</h3>

<div className="payment-tabs">

<button
className={method==="card"?"active":""}
onClick={()=>setMethod("card")}
>
<CreditCard size={18}/> {t("payment.card")}
</button>

<button
className={method==="upi"?"active":""}
onClick={()=>setMethod("upi")}
>
<Smartphone size={18}/> {t("payment.upi")}
</button>

<button
className={method==="bank"?"active":""}
onClick={()=>setMethod("bank")}
>
<Landmark size={18}/> {t("payment.net_banking")}
</button>

</div>

{/* CARD FORM */}

{method==="card" && (

<div className="form">

<div className="input-box">
<User size={16}/>
<input
type="text"
placeholder={t("payment.card_name")}
value={cardName}
onChange={(e)=>setCardName(e.target.value)}
/>
</div>

<div className="input-box">
<CreditCard size={16}/>
<input
type="text"
placeholder={t("payment.card_number")}
value={cardNumber}
maxLength={19}
onChange={(e)=>setCardNumber(formatCardNumber(e.target.value))}
/>
</div>

<div className="row">

<div className="input-box">
<input
type="text"
placeholder={t("payment.expiry")}
value={expiry}
onChange={(e)=>setExpiry(formatExpiry(e.target.value))}
/>
</div>

<div className="input-box">
<ShieldCheck size={16}/>
<input
type="password"
placeholder={t("payment.cvv")}
maxLength={3}
value={cvv}
onChange={(e)=>setCvv(e.target.value.replace(/\D/g,""))}
/>
</div>

</div>

</div>

)}

{/* UPI */}

{method==="upi" && (

<div className="form">

<div className="input-box">
<Smartphone size={16}/>
<input
type="text"
placeholder={t("payment.upi_placeholder")}
value={upi}
onChange={(e)=>setUpi(e.target.value)}
/>
</div>

</div>

)}

{/* NETBANKING */}

{method==="bank" && (

<div className="form">

<div className="input-box">
<Landmark size={16}/>
<select value={bank} onChange={(e)=>setBank(e.target.value)}>
<option value="">{t("payment.select_bank")}</option>
<option>State Bank of India</option>
<option>HDFC Bank</option>
<option>ICICI Bank</option>
<option>Axis Bank</option>
</select>
</div>

</div>

)}

<div className="coupon-box">

<input
type="text"
placeholder={t("payment.coupon")}
value={coupon}
onChange={(e)=>setCoupon(e.target.value)}
className="coupon-input"
/>

<button onClick={applyCoupon} className="coupon-btn">
{t("payment.apply")}
</button>

</div>

{couponMessage && (
<p className={couponSuccess ? "coupon-success" : "coupon-error"}>
{couponMessage}
</p>
)}


<button
  className="pay-btn"
  onClick={handlePayment}
  disabled={loading}
>
{loading
  ? t("payment.processing")
  : t("payment.pay_now", { amount: `${symbol}${finalPrice.toFixed(2)}` })
}
</button>

</div>

{/* RIGHT PLAN DETAILS */}

<div className="plan-box">

<div className="badge">
{t("payment.billing_monthly")}
</div>

<h3>
{selectedPlan.name} {t("payment.details")}
</h3>

<ul>

{selectedPlan.features.map((feature,index)=>(

<li key={index}>
<Check size={16}/> {feature}
</li>

))}

</ul>

<div className="price-breakdown">

<div className="price-row">
<span>{t("payment.plan_price")}</span>
<span>{symbol}{total.toFixed(2)}</span>
</div>

{discount > 0 && (
<div className="price-row discount">
<span>{t("payment.coupon_discount")}</span>
<span>- {symbol}{discount.toFixed(2)}</span>
</div>
)}

{discount > 0 && (
<p className="savings-text">
{t("payment.savings", { amount: `${symbol}${discount.toFixed(2)}` })}
</p>
)}

<div className="price-row">
<span>{t("payment.tax")}</span>
<span>{symbol}{tax.toFixed(2)}</span>
</div>

<div className="price-divider"></div>

<div className="price-total">
<span>{t("payment.total")}</span>
<span>{symbol}{finalPrice.toFixed(2)}</span>
</div>

<span className="billing-text">
/ {billingCycle === "quarterly" ? t("payment.quarterly") : t("payment.monthly")}
</span>

</div>

</div>

</div>
</div>

);
}
