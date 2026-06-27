import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Heart, ShieldCheck, AlertTriangle, Receipt, Scale, FileText } from "lucide-react";

const PLATFORM = "Alyssia's Angels";
const LAST_UPDATED = "February 2026";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700">
              Legal · Terms of Service
            </span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-blue-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-slate-500 mt-3 text-sm">
            Last updated: {LAST_UPDATED} · Please read carefully before using {PLATFORM}.
          </p>
        </div>

        {/* TOC */}
        <nav
          aria-label="Sections"
          className="mb-10 bg-white border border-slate-200 rounded-2xl p-5"
          data-testid="terms-toc"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 mb-3">
            On this page
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-700 list-decimal list-inside">
            <li><a href="#nature" className="hover:text-emerald-600">Platform Role & Escrow Disclaimer</a></li>
            <li><a href="#fees" className="hover:text-emerald-600">Fees and Deductions</a></li>
            <li><a href="#payouts" className="hover:text-emerald-600">Fund Withdrawal and Fraud Prevention</a></li>
            <li><a href="#risk" className="hover:text-emerald-600">Donor Assumption of Risk</a></li>
            <li><a href="#tax" className="hover:text-emerald-600">Tax Liabilities</a></li>
          </ol>
        </nav>

        <article className="space-y-10" data-testid="terms-content">
          <Section
            id="nature"
            number="1"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Platform Role & Escrow Disclaimer"
          >
            <p className="font-semibold text-slate-900">Nature of Services.</p>
            <p>
              <strong>{PLATFORM}</strong> is a software infrastructure platform that facilitates
              independent crowdsourcing campaigns. By using this platform, you acknowledge and
              agree that all donations are initially processed and held within the platform
              owner&apos;s central PayPal commercial account. <strong>{PLATFORM}</strong> acts solely
              as an administrative ledger to track, calculate, and distribute these funds upon
              verified request. We are <strong>not a bank, a credit union, an escrow agent, or
              a licensed financial institution</strong>. Funds held in the platform account do
              not earn interest.
            </p>
          </Section>

          <Section
            id="fees"
            number="2"
            icon={<Receipt className="h-5 w-5" />}
            title="Fees and Deductions"
          >
            <p className="font-semibold text-slate-900">Fees and Deductions.</p>
            <p>
              All donations are subject to a mandatory, non-refundable
              <strong> flat 13% processing fee</strong>. This single fee
              absorbs the inbound payment processing charges (PayPal /
              card), the international banking charges incurred on payout,
              and <strong>{PLATFORM}</strong>&apos;s administrative platform
              maintenance — no additional deductions apply.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-900 mb-2">
                Worked example
              </p>
              <p className="text-blue-900">
                On a gross donation of <strong>$100.00</strong>, exactly
                <strong> $13.00</strong> is deducted. The fundraiser&apos;s
                clear, transferrable dashboard ledger will be credited
                <strong> $87.00</strong>, which is what they can withdraw at
                any time since their last payout.
              </p>
            </div>
            <p>
              By launching a campaign or submitting a donation, all users expressly consent to
              this fee allocation.
            </p>
          </Section>

          <Section
            id="payouts"
            number="3"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Fund Withdrawal and Fraud Prevention"
          >
            <p className="font-semibold text-slate-900">Fund Withdrawal and Fraud Prevention.</p>
            <p>
              Fundraisers may request a manual payout of their accumulated{" "}
              <em>&quot;Net Balance&quot;</em> at any time through their creator dashboard. However,
              to protect our donor community and prevent financial crimes,{" "}
              <strong>{PLATFORM}</strong> reserves the absolute right to mandate identity
              verification (including but not limited to government-issued identification, tax
              identifiers, or proof of charitable status) before initiating any electronic
              transfer.
            </p>
            <p>
              We reserve the right to <strong>indefinitely freeze, withhold, or refund</strong>{" "}
              balances if there is reasonable suspicion of campaign misrepresentation, fraud,
              or violation of applicable local laws.
            </p>
          </Section>

          <Section
            id="risk"
            number="4"
            icon={<Heart className="h-5 w-5" />}
            title="Donor Assumption of Risk"
          >
            <p className="font-semibold text-slate-900">Donor Assumption of Risk.</p>
            <p>
              <strong>{PLATFORM}</strong> does not independently audit, verify, or guarantee
              the truthfulness, accuracy, or execution of any fundraiser&apos;s stated goals or
              personal stories. As a donor, you acknowledge that{" "}
              <strong>all payments are made voluntarily and entirely at your own risk</strong>.
              {" "}<strong>{PLATFORM}</strong> is under no legal obligation to issue refunds once
              a payment has successfully cleared through PayPal, and any disputes regarding the
              ultimate use of funds must be handled directly between the donor and the
              fundraiser.
            </p>
          </Section>

          <Section
            id="tax"
            number="5"
            icon={<Scale className="h-5 w-5" />}
            title="Tax Liabilities"
          >
            <p className="font-semibold text-slate-900">Tax Liabilities.</p>
            <p>
              <strong>{PLATFORM}</strong> does not provide legal, accounting, or tax advice.
              Fundraisers are <strong>exclusively and personally responsible</strong> for
              determining what tax reporting or liabilities (such as income tax or gift tax)
              apply to the total funds they raise and withdraw. The platform will not issue
              tax-deductible receipts unless a campaign is explicitly registered and verified
              as a certified <strong>501(c)(3)</strong> or regional non-profit entity.
            </p>
          </Section>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-12 text-sm text-slate-600">
            <p>
              By continuing to use <strong>{PLATFORM}</strong>, you confirm that you have read,
              understood, and agreed to all five sections above. If you do not agree, please
              discontinue use of the platform immediately.
            </p>
            <p className="mt-3">
              Questions? Contact us at{" "}
              <a href="mailto:admin@platform.com" className="text-blue-900 font-semibold hover:text-emerald-600">
                admin@platform.com
              </a>
              .
            </p>
          </div>
        </article>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <Link
            to="/"
            className="text-sm font-medium text-blue-900 hover:text-emerald-600"
            data-testid="terms-back-home"
          >
            ← Back to home
          </Link>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} {PLATFORM}</p>
        </div>
      </main>
    </div>
  );
}

function Section({ id, number, icon, title, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8"
      data-testid={`terms-section-${id}`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="h-10 w-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-600">
            SECTION {number}
          </p>
          <h2 className="font-heading text-2xl font-semibold text-blue-900 mt-0.5">
            {title}
          </h2>
        </div>
      </div>
      <div className="prose prose-slate max-w-none text-slate-700 text-base leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
