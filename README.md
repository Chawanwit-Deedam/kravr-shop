# Kravr — ร้านช้อป "ของมันต้องมี" (Shopping Demo)

เว็บช้อปปิ้งสาธิต **look & feel** สำหรับสายช้อป — เพิ่มลงตะกร้าและชำระเงินได้ลื่นไหล
**เป็นการจำลองทั้งหมด ไม่มีการเก็บเงินจริง / ไม่มีสินค้าจัดส่งจริง** เขียนด้วย HTML/CSS/JS ล้วน ไม่มี dependency

![stack](https://img.shields.io/badge/stack-vanilla-ec4899) ![deps](https://img.shields.io/badge/dependencies-0-a855f7)

## 🛍️ ฟีเจอร์
- แคตตาล็อกสินค้า + **กรองหมวดหมู่** + **ค้นหาสด**
- **เพิ่มลงตะกร้า** → badge เด้ง + toast + **ตะกร้าสไลด์ออกข้าง** (ปรับจำนวน/ลบ)
- **หลอดส่งฟรี** เมื่อช้อปครบ ฿1,000 (จิตวิทยาการช้อป)
- **Checkout จำลอง** (ที่อยู่ + วิธีจ่าย COD/บัตร/พร้อมเพย์) → หน้า "สั่งซื้อสำเร็จ" + **confetti**
- 💾 จำตะกร้าไว้ใน `localStorage` · 🌗 โหมดสว่าง/มืด · ⌨️ ปิดด้วย Esc
- 📱 **Responsive** — mobile / tablet / desktop (การ์ดปรับ 4→3→2→1 คอลัมน์)

## 🔒 ความปลอดภัย / ความซื่อสัตย์
- ติดป้ายชัดเจนว่าเป็น **เดโม ไม่มีการชำระเงินจริง** และ default เป็น "เก็บเงินปลายทาง" (ไม่ต้องกรอกบัตร)
- ฟอร์ม checkout **ไม่ส่ง / ไม่บันทึกข้อมูลไปที่ใด** — client-side ล้วน
- CSP เข้ม · ไม่มี `innerHTML`/`eval` (สร้าง DOM ด้วย `createElement` + `textContent`) · รองรับ `prefers-reduced-motion`

## 📁 โครงสร้าง
```
kravr/
├─ index.html
├─ styles.css
├─ theme-init.js
├─ script.js       # ข้อมูลสินค้า + ตะกร้า + checkout + toast + confetti
├─ favicon.svg
└─ README.md
```

## ▶️ รันในเครื่อง
```bash
python -m http.server 5179   # แล้วเปิด http://localhost:5179
```

## 🚀 Deploy ฟรี
static ล้วน — ลากโฟลเดอร์ไปวางที่ [Netlify Drop](https://app.netlify.com/drop) หรือเชื่อม GitHub + Netlify แบบ CI/CD ได้เหมือนโปรเจกต์อื่น

## 🎨 ปรับแต่ง
- สินค้า/ราคา/หมวดหมู่: แก้อาร์เรย์ `PRODUCTS` / `CATS` ใน `script.js`
- เกณฑ์ส่งฟรี: `FREE_SHIP` / `SHIP_FEE` ใน `script.js`
- โทนสี: ตัวแปรใน `:root` ของ `styles.css` (`--brand`, `--grad`)

---
> งานสาธิตเพื่อการนำเสนอผลงาน — สินค้า ราคา และการชำระเงินเป็นการจำลองทั้งหมด ไม่มีธุรกรรมจริง
