

# Add mobile hamburger menu to PublicLayout

## What
Add a hamburger menu icon to the mobile header that opens a slide-out sheet/drawer containing all public navigation links (Home, Pricing, Contact, Terms, Privacy, Cancellation Policy).

## Changes

### `src/components/layout/PublicLayout.tsx`
- Import `Sheet`, `SheetTrigger`, `SheetContent` from `@/components/ui/sheet` and `Menu` icon from lucide-react
- In the mobile `div` (`md:hidden`), add a hamburger `Menu` icon button that triggers a `Sheet` (slide from right)
- Inside the sheet: render all `navLinks` as vertical `Link` items, plus the login button and language toggle
- Close the sheet on link click using controlled state

### No other files need changes
The sheet component already exists in the project. All nav links and translations are already defined in PublicLayout.

