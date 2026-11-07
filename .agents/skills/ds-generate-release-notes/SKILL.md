---
name: ds-generate-release-notes
description: Automatically fetches commits since the last git tag, generates concise release notes and Facebook announcement post, determines the next semantic version, and creates a new git tag. Use when the user asks to generate release notes or create a new release.
---

# Generate Release Notes & Auto-Tag

When the user asks you to generate release notes or create a new release, follow these STRICT rules:

**CRITICAL RULES:**
1. **NO ICONS OR EMOJIS**: Do not use any emojis (like rocket, bug, fire, etc.) anywhere in the output, release notes, or Facebook post. Keep everything strictly text-only and professional.
2. **ENGLISH ONLY FOR RELEASE_NOTES.md**: The generated `RELEASE_NOTES.md` MUST be written entirely in English, regardless of the language used in the commit messages or the user's prompt.
3. **BILINGUAL FACEBOOK POST (VIETNAMESE WITH ACCENTS + ENGLISH)**: The post in `docs/details/facebook-detail-release-update.md` must be written in proper accented Vietnamese (Tiếng Việt có dấu đầy đủ) followed by a matching English version, suitable for social media groups, fanpages, and international audiences.
4. **NO LINKS IN FACEBOOK POST (AVOID REACH PENALTY)**: Absolutely DO NOT include any URLs or links in the Facebook announcement text (including links causes Facebook's algorithm to penalize reach / flop). Always guide users to grab the download links in the comment section below the post.
5. **SHORT & PUNCHY BULLET POINTS**: Keep each bullet point in the Facebook post very concise (1 short punchy sentence or phrase per bullet), avoiding long paragraphs or walls of text for maximum readability.
6. **MANDATORY HASHTAGS IN FACEBOOK POST**: Always append the official hashtags `#FDShowStudio #firework` at the end of the Facebook post.
7. **MANDATORY SECTIONS IN RELEASE_NOTES.md**: You must use exactly the main sections defined below (Downloads, Features, Bug Fixes, Updates, Chores). If a section has no relevant commits, you may omit that section.
8. **NON-TECHNICAL DESCRIPTIONS**: All descriptions must be extremely concise, simple, and easy to understand for non-technical users. Avoid coding jargon (such as 'instanced rendering', 'draw calls', 'vertex shader', 'buffer allocation') and instead focus on user-facing benefits (e.g., write 'Improved display performance when spawning many fireworks' instead of 'implemented instanced shell rendering to reduce draw calls').

## 1. Fetch Commits Since Last Tag
- Use the terminal (`run_command` tool) to find the most recent git tag: `git describe --tags --abbrev=0`.
- If no tags exist, get all commits from the beginning: `git log --oneline`.
- Otherwise, get all commits from the last tag to HEAD: `git log <last_tag>..HEAD --oneline`.

## 2. Determine New Version
- Analyze the fetched commits to determine the next version based on Semantic Versioning (SemVer):
  - **Major**: If there are breaking changes.
  - **Minor**: If there are new features (`feat`).
  - **Patch**: If there are only bug fixes (`fix`) and chores/updates.
- Determine the new tag name (e.g., if the previous was `v1.2.0` and there's a new feature, the new tag becomes `v1.3.0`).

## 3. Analyze and Categorize
Categorize the fetched commits into the following standard groups:
- **Features** (`feat`, `add`, new functionalities)
- **Bug Fixes** (`fix`, `bug`, resolved issues)
- **Updates** (`refactor`, `perf`, `update`, optimizations)
- **Chores** (`docs`, `chore`, `test`, maintenance)

## 4. Determine Download Links (for RELEASE_NOTES.md only)
Determine the download URLs for `.exe` (Windows Installer) and `.zip`/`.rar` (Portable Archive):
1. **User-Provided Link**: If the user provided a download URL or draft release hash in their message, use that exact base path and file names.
2. **Inspect `dist-electron`**: Check the `dist-electron` directory to detect the build artifact filenames.
3. **Standard Canonical Release URL Structure**: The standard asset naming convention on GitHub Releases is:
   - Base URL: `https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/`
   - Windows Installer (.exe): `[Firework.Drone.Show.Studio.Setup.<version>.exe](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/Firework.Drone.Show.Studio.Setup.<version>.exe)`
   - Portable Archive (.zip / .rar): `[Firework.Drone.Show.Studio-<version>-win.zip](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/Firework.Drone.Show.Studio-<version>-win.zip)`
   - All Release Assets: `[GitHub Releases [New Version Tag]](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/tag/[New Version Tag])`

## 5. Format the Canonical Release Notes (RELEASE_NOTES.md)
Structure the output using Markdown IN ENGLISH. Use exactly this structure:

```markdown
# Release Notes - [New Version Tag]

## Downloads
- Windows Installer (.exe): [Firework.Drone.Show.Studio.Setup.<version>.exe](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/Firework.Drone.Show.Studio.Setup.<version>.exe)
- Portable Archive (.zip / .rar): [Firework.Drone.Show.Studio-<version>-win.zip](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/download/[New Version Tag]/Firework.Drone.Show.Studio-<version>-win.zip)
- All Release Assets: [GitHub Releases [New Version Tag]](https://github.com/ThAolInh20/Shell-Drone-Editor/releases/tag/[New Version Tag])

## Features
- [Short description of the new feature in English]
- ...

## Bug Fixes
- [Short description of the fix in English]
- ...

## Updates
- [Short description of the update in English]
- ...

## Chores
- [Short description of the chore in English]
- ...
```

## 6. Format the Facebook Announcement Post (facebook-detail-release-update.md)
Generate a bilingual promotional announcement post in `docs/details/facebook-detail-release-update.md`.
It must strictly follow these rules:
1. **Vietnamese version with full accents (Tiếng Việt có dấu đầy đủ)**.
2. **English version**.
3. **NO URLs OR LINKS**: Do NOT include any HTTP/HTTPS links in the post text. Direct readers to the comment section.
4. **Mandatory Hashtags**: End with `#FDShowStudio #firework`.
5. **No Emojis**: Keep it text-only and clean.

Template:

```markdown
# Cập nhật phiên bản mới: Firework & Drone Show Studio [New Version Tag]

Chào cả nhà, bản cập nhật [New Version Tag] của Firework & Drone Show Studio đã chính thức ra mắt với nhiều tính năng mới hấp dẫn cùng các cải tiến tối ưu giúp trải nghiệm tạo show mượt mà và trực quan hơn!

Các điểm mới nổi bật:
- [Tính năng 1: Mô tả ngắn gọn, lợi ích nổi bật]
- [Tính năng 2: Mô tả ngắn gọn, lợi ích nổi bật]
- [Sửa lỗi & Tối ưu: Khắc phục các lỗi đã biết, tối ưu hiển thị và độ ổn định]

Toàn bộ link tải bản cài đặt (.exe) và bản chạy ngay (.zip) mình để chi tiết ngay dưới phần bình luận nhé!

Mọi người tải về trải nghiệm và để lại góp ý nhé!

#FDShowStudio #firework

---

# New Release Announcement: Firework & Drone Show Studio [New Version Tag]

Hello creators! The latest update [New Version Tag] of Firework & Drone Show Studio is officially available, bringing exciting new capabilities and optimizations for designing spectacular light shows!

Key Highlights:
- [Feature 1: Clear benefit and user value]
- [Feature 2: Clear benefit and user value]
- [Fixes & Performance: Smoother performance and bug fixes]

All download links (Installer .exe and Portable .zip) are available in the first comment below!

Download now and bring your creative firework and drone choreographies to life!

#FDShowStudio #firework
```

## 7. Update package.json Version
- Update the `"version"` field in the project's `package.json` file to match the new version tag (e.g. if the new version is `v2.1.1`, update it to `"2.1.1"` without the `"v"` prefix).

## 8. Save the Release Notes Files
Use the file writing tool to save both release files:
- Completely OVERWRITE `RELEASE_NOTES.md` with the English technical release notes.
- Completely OVERWRITE `docs/details/facebook-detail-release-update.md` with the bilingual Facebook announcement post without links.

## 9. Stage, Commit, Auto-Create Git Tag, and Push
After the files are successfully saved, automatically stage, commit, create the new git tag, and push to remote:
- Run `git add package.json RELEASE_NOTES.md docs/details/facebook-detail-release-update.md`
- Run `git commit -m "docs: release <new_version>"`
- Run `git tag <new_version>`
- Run `git push origin <new_version>`
- Run `git push origin HEAD`
