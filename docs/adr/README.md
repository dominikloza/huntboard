# Architecture Decision Records

| #   | Decision                                                                                                    | Status   |
| --- | ----------------------------------------------------------------------------------------------------------- | -------- |
| 001 | [Next.js as the only server](001-nextjs-fullstack.md)                                                       | Accepted |
| 002 | [Visual direction B and design tokens](002-visual-direction-b.md)                                           | Accepted |
| 003 | [Self-hosted fonts via Fontsource](003-self-hosted-fonts.md)                                                | Accepted |
| 004 | [Better Auth with GitHub sign-in and guest accounts](004-better-auth.md)                                    | Accepted |
| 005 | [Postgres on Neon, Drizzle ORM, SQL migrations](005-postgres-drizzle.md)                                    | Accepted |
| 006 | [Board data: TanStack Query reads, Server Action writes, sheet routing](006-data-fetching-and-mutations.md) | Accepted |
| 007 | [Drag & drop: dnd-kit, fractional positions, optimistic moves](007-drag-and-drop.md)                        | Accepted |

Planned (write them when the decision is made, see `docs/PLAN.md` §8):

- Filter state in the URL instead of a global store (Day 4)
- Streaming structured output and human in the loop (Day 5)
- AI cost protection: rate limit, input limits, guest account (Day 6)
