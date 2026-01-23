# Bug Fixes: Empty Anchor Links & Date Format Validation

## Bug #6: Empty Anchor Link

### Problem
When a show doesn't have a permalink, the "View on Phish.net" link had an empty href attribute (`href=""`), which caused the page to reload when clicked instead of being disabled or hidden.

**Location:** [src/components/ShowDetails.tsx:63-70](src/components/ShowDetails.tsx#L63-L70)

```typescript
// Before - Always renders link with potentially empty href
<a
  href={show.permalink || ''}
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm inline-flex items-center gap-1 text-primary hover:underline transition-colors"
>
  View on Phish.net <ExternalLink className="h-3 w-3" />
</a>
```

### Issues This Caused
- Clicking on link when `permalink` is empty/undefined reloads the current page
- Confusing user experience (link appears clickable but doesn't navigate)
- Creates `<a href="">` which is invalid HTML
- No visual indication that the link is unavailable

### Solution
Conditionally render the link only when a valid permalink exists:

```typescript
// After - Only renders link if permalink exists
{show.permalink && show.permalink.trim() !== '' && (
  <a
    href={show.permalink}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm inline-flex items-center gap-1 text-primary hover:underline transition-colors"
  >
    View on Phish.net <ExternalLink className="h-3 w-3" />
  </a>
)}
```

### Validation Logic
The link now only renders when:
1. `show.permalink` exists (not null/undefined)
2. `show.permalink.trim()` is not an empty string
3. Both conditions must be true

### Impact

**Before Fix:**
```
Permalink missing → <a href=""> rendered → Click reloads page
Permalink = " "   → <a href=" "> rendered → Click navigates to whitespace
```

**After Fix:**
```
Permalink missing → Link not rendered → Clean UI, no broken interaction
Permalink = " "   → Link not rendered → Whitespace URLs prevented
Valid permalink   → Link rendered → Normal navigation works
```

### Benefits
- ✅ No more page reloads from empty links
- ✅ Clean UI when permalink unavailable
- ✅ Better accessibility (no broken links)
- ✅ Valid HTML (no empty href attributes)

---

## Bug #7: Missing Date Format Validation

### Problem
The `formatShowDate()` function assumed input was in YYYY-MM-DD format without validation. If the API returned dates in different formats (MM/DD/YYYY, etc.), the parsing would fail silently or produce incorrect results.

**Location:** [src/services/date-utils.ts:11-27](src/services/date-utils.ts#L11-L27)

```typescript
// Before - No validation
export function formatShowDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', { ... }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
}
```

### Issues This Caused
- `split('-')` on "12/31/2024" produces `["12/31/2024"]` → fails silently
- Non-numeric strings like "abc-def-ghi" get parsed as NaN
- Invalid dates like "2023-02-30" (Feb 30) get rolled over to March
- Empty or null inputs cause errors
- No validation of month/day ranges (month 13, day 32, etc.)

### Solution
Added comprehensive validation before parsing:

```typescript
export function formatShowDate(dateString: string): string {
  try {
    // 1. Validate input exists and is a string
    if (!dateString || typeof dateString !== 'string') {
      console.warn("Invalid date string provided:", dateString);
      return String(dateString || '');
    }

    // 2. Validate YYYY-MM-DD format using regex
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(dateString)) {
      console.warn(`Date string "${dateString}" is not in YYYY-MM-DD format`);
      return dateString;
    }

    // 3. Validate we have exactly 3 parts
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      console.warn(`Invalid date parts for "${dateString}"`);
      return dateString;
    }

    // 4. Parse components
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // 5. Validate parsed values are valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn(`Failed to parse date components from "${dateString}"`);
      return dateString;
    }

    // 6. Validate month and day ranges
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn(`Invalid month or day in "${dateString}"`);
      return dateString;
    }

    // 7. Create date and validate it's not invalid
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date created from "${dateString}"`);
      return dateString;
    }

    // 8. Verify date didn't roll over (e.g., Feb 30 → Mar 2)
    if (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
      console.warn(`Date "${dateString}" rolled over to different date`);
      return dateString;
    }

    // 9. Format the valid date
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return String(dateString || '');
  }
}
```

### Validation Steps

1. **Type Check**: Ensure input is a non-empty string
2. **Format Check**: Regex validates `\d{4}-\d{2}-\d{2}` pattern
3. **Component Count**: Ensure exactly 3 parts after splitting
4. **Parse Values**: Convert strings to integers
5. **NaN Check**: Verify parsing succeeded
6. **Range Check**: Month 1-12, day 1-31
7. **Date Creation**: Create Date object and check validity
8. **Rollover Check**: Ensure date components didn't change (Feb 30 → Mar 2)
9. **Format**: Only format if all checks pass

### Examples

**Valid Dates:**
```typescript
formatShowDate('2023-06-15')   → "Thursday, June 15, 2023"
formatShowDate('1983-12-02')   → "Friday, December 2, 1983"
formatShowDate('2024-02-29')   → "Thursday, February 29, 2024" (leap year)
```

**Invalid Dates (return original):**
```typescript
formatShowDate('12/31/2023')   → "12/31/2023" (wrong format)
formatShowDate('2023-13-01')   → "2023-13-01" (invalid month)
formatShowDate('2023-02-30')   → "2023-02-30" (Feb 30 doesn't exist)
formatShowDate('2023-04-31')   → "2023-04-31" (April 31 doesn't exist)
formatShowDate('not-a-date')   → "not-a-date" (not a date)
formatShowDate('')             → "" (empty string)
```

### Impact

**Before Fix:**
```javascript
formatShowDate('12/31/2023')  → Incorrect parsing
formatShowDate('2023-02-30')  → "Tuesday, March 2, 2023" (rolled over)
formatShowDate('abc-def-ghi') → Crash or "NaN NaN, NaN"
```

**After Fix:**
```javascript
formatShowDate('12/31/2023')  → "12/31/2023" (original returned)
formatShowDate('2023-02-30')  → "2023-02-30" (invalid caught)
formatShowDate('abc-def-ghi') → "abc-def-ghi" (validation caught)
```

### Benefits
- ✅ Prevents incorrect date displays
- ✅ Catches invalid dates (Feb 30, etc.)
- ✅ Handles unexpected formats gracefully
- ✅ Detailed warning logs for debugging
- ✅ No crashes from malformed input
- ✅ Validates leap years correctly

---

## Testing

### Unit Tests Added

**File:** [src/tests/date-utils.test.ts](src/tests/date-utils.test.ts)

Comprehensive test coverage including:

**Valid Date Tests:**
- Standard dates (2023-06-15)
- Dates with leading zeros (2023-01-05)
- Historical dates (Phish first show: 1983-12-02)
- Leap year dates (2024-02-29)

**Invalid Format Tests:**
- Wrong format (12/31/2023, 2023/12/31)
- Non-date strings (not-a-date)
- Partial dates (2023-12, 2023, 12-31)
- Extra components (2023-12-31-extra)

**Invalid Date Tests:**
- Invalid months (00, 13)
- Invalid days (00, 32)
- Dates that don't exist (Feb 30, April 31)
- Non-leap year Feb 29 (2023-02-29)

**Edge Cases:**
- Empty strings
- Null/undefined input
- Non-numeric components (abcd-ef-gh)

### Manual Testing

**Empty Anchor Link:**
1. Find a show without a permalink in the API data
2. Verify "View on Phish.net" link is not rendered
3. Confirm no page reload when clicking where link would be
4. Check that shows with valid permalinks still display the link

**Date Validation:**
1. Test with various show dates to confirm proper formatting
2. Check console for any date validation warnings
3. Verify dates display as "Thursday, June 15, 2023" format
4. Test boundary dates (first show, recent shows)

### Edge Cases Covered

**Link Rendering:**
- `permalink = undefined`
- `permalink = null`
- `permalink = ""`
- `permalink = "   "` (whitespace)
- `permalink = "https://valid-url.com"`

**Date Parsing:**
- Valid YYYY-MM-DD dates
- Invalid formats (MM/DD/YYYY, DD-MM-YYYY)
- Invalid dates (Feb 30, month 13)
- Leap years (valid and invalid)
- Empty/null inputs
- Non-string inputs

---

## Summary

### Bug #6: Empty Anchor Link
**Status:** ✅ Fixed
**Files Modified:**
- [src/components/ShowDetails.tsx](src/components/ShowDetails.tsx)

**Result:** Links only render when valid permalinks exist. No more empty href attributes or page reloads.

### Bug #7: Date Format Validation
**Status:** ✅ Fixed
**Files Modified:**
- [src/services/date-utils.ts](src/services/date-utils.ts)
- [src/tests/date-utils.test.ts](src/tests/date-utils.test.ts) (new file)

**Result:** Comprehensive date validation prevents incorrect parsing and displays. All edge cases handled gracefully.

---

## Additional Recommendations

### For Empty Links
- Consider adding a visual indicator when permalink is unavailable
- Add tooltip: "Link not available for this show"
- Log missing permalinks for API data quality monitoring

### For Date Validation
- Consider using a date library like `date-fns` for more robust parsing
- Add timezone handling if shows are in different timezones
- Validate dates on API input (before storing/processing)
- Add date range validation (no shows before 1983-12-02)

### General
- Add API response schema validation (Zod, Yup)
- Implement error boundaries for graceful error handling
- Add monitoring/logging for validation failures
- Create user-facing error messages for invalid data
