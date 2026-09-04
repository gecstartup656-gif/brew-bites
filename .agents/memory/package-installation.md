---
name: Workspace package installation
description: Installing a dependency for one artifact in this pnpm monorepo
---

When adding a package to a single artifact, target the workspace package explicitly rather than the repository root.

**Why:** The generic package installer can resolve the monorepo root and refuse to add an app dependency there.

**How to apply:** Use the artifact's `@workspace/<slug>` filter when the package belongs to one app.