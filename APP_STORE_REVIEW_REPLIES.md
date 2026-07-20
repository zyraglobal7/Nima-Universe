# App Store Review — Reply Templates

Submission ID: fb9bda42-0ae6-414a-8676-aa6cf2c4fde9

Copy the relevant sections into the **App Review** reply box in App Store Connect
after the new build (with the code changes) is uploaded.

---

## Guideline 2.1(b) — Business model / paid digital content

> Answers to the five questions.

**Summary:** On iOS, Nima does **not** sell any digital content, subscriptions,
or features. All AI features run on **free** credits. The only in-app purchases
are **physical clothing items** that are shipped to the customer, paid for with
M-Pesa (a local mobile-money method in Kenya). Physical goods and services are
not eligible for In-App Purchase per Guidelines 3.1.3(e) and 3.1.5(a).

1. **Who are the users that will use the paid content, subscriptions, and
   features in the app?**
   Nima's users are shoppers (primarily in Kenya) who use the app to discover
   fashion, get AI styling advice, virtually try on clothing, and buy real
   clothing items that are delivered to them.

2. **Where can users purchase the content, subscriptions, features, and
   services that can be accessed in the app?**
   The only purchases available on iOS are **physical clothing products**,
   bought inside the app and delivered to the user's shipping address. Payment
   is handled by M-Pesa (Fingo Pay). There is no digital content, subscription,
   or feature sold on iOS.

3. **What specific types of previously purchased content, subscriptions,
   features, and services can a user access in the app?**
   None that are digital. Users can view their order history for physical
   clothing they have purchased. The AI features (virtual try-on, look
   generation, and stylist chat) are provided using **free** weekly credits and
   are not purchased.

4. **What paid content, subscriptions, or features are unlocked within the app
   that do not use In-App Purchase?**
   None on iOS. AI usage is powered by free credits (users receive a set number
   of free credits each week). The iOS build contains **no** UI to purchase
   credits or any other digital content. The only paid transactions are for
   physical clothing, which is delivered and therefore uses an external payment
   method (M-Pesa) as permitted for physical goods.

5. **Can users purchase physical goods or services together with digital content
   in your app? If so, please describe how the physical and digital content are
   connected and why you bundle them together in a single purchase.**
   No. Purchases are for physical clothing only. There is no bundling of digital
   content with physical goods. The AI/digital experience is free and separate
   from the physical clothing purchase.

---

## Guideline 4.8 — Login Services (identify the qualifying option)

> Use this once the new build adds native Sign in with Apple.

Nima offers **Sign in with Apple** as an equivalent login option, implemented
natively with Apple's AuthenticationServices (via `expo-apple-authentication`).
It meets all three requirements of Guideline 4.8:

- It limits data collection to the user's name and email address.
- It lets the user keep their email address private (Apple's Hide My Email /
  private relay), configured at account setup.
- It does not collect interactions with the app for advertising purposes
  without consent.

Sign in with Apple is presented on the first launch/login screen alongside our
other sign-in options, using Apple's standard Sign in with Apple button.

---

## Guideline 4 — iPad layout (note for the reviewer)

The new build revises the post-login layout so content fills the iPad screen:
grids now use additional columns and wider spacing on iPad-class screens instead
of the narrow two-column phone layout. Please re-test on iPad after installing
the new build.

---

## Guideline 1.5 — Support URL

A functional support page is now live at **https://www.shopnima.ai/support**
with contact information (support@shopnima.ai) and help topics. (Ensure the
Support URL field in App Store Connect points here.)
