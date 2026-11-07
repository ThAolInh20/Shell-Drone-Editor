---
name: ds-create-shell
description: Huong dan nha phat trien va AI cach tim kiem file, sua doi, tao moi phao hoa (presets, shapes, effects, dynamics) trong thu vien firework-engine va dong bo sang cac ung dung (Studio va TikTok Live).
---

# Skill: create-shell

Skill nay giup cac nha phat trien (Developer) va Tro ly AI (AI Agents) tao moi hoac chinh sua cac loai phao hoa (Shapes, Dynamics, Modifiers, Visual Effects, Presets) dung kien truc Component-based Composition va phat hanh cap nhat an toan.

## QUAN TRONG: THAY DOI TAI THU VIEN CHUNG (FIREWORK-ENGINE)

Toan bo ma nguon logic, vat ly, hinh dang va hieu ung phao hoa da duoc tach thanh thu vien dung chung doc lap:
- **Duong dan thu vien**: `../firework-engine` (hoac `e:\firework-engine`).
- **Quy tac bat buoc**: TUYET DOI KHONG sua doi hay them moi phao hoa truc tiep trong thu muc `src/factories/` cua project nay (`shell-drone-animation`).
- Moi thay doi ma nguon phao hoa BAT BUOC phai duoc thuc hien tai `../firework-engine/src/`:
  1. Thuc hien code tai `../firework-engine/src/`.
  2. Chay `npm test` tai `../firework-engine` de dam bao 100% unit tests pass.
  3. Chay `npm run build` tai `../firework-engine` de bien dich ra bundle moi trong `dist/`.
  4. Sau khi build xong, ca Studio va TikTok Live deu tu dong nhan hieu ung moi qua package `@shell-drone/firework-engine`.
  5. Tai project hien tai (`shell-drone-animation`), chi can bo sung ban dich ngon ngu tai `./src/config/lang/` va video preview tai `./public/previews/` (neu co).

Mac dinh khi tao moi phao hoa tuyet doi khong them smoke (burstSmoke/launchSmoke = false) tru khi co yeu cau ro rang.

Vui long xem huong dan chi tiet va cac bieu mau code tai: [workflow.md](workflow.md).
