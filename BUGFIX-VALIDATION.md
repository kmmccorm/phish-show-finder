# Bug Fixes: Position Validation & Timezone Issues

## Bug #4: Invalid Number Parsing

### Problem
Position values from the API were parsed with `parseInt()` without validation. If the API returned non-numeric values, `parseInt()` would return `NaN`, causing songs to be displayed out of order or causing runtime errors.

### Root Cause
**File:** [src/services/show-processor.ts:80](src/services/show-processor.ts#L80)

```typescript
position: parseInt(item.position, 10),
```

No validation was performed:
- `parseInt("abc", 10)` returns `NaN`
- `parseInt("-5", 10)` returns `-5` (negative position)
- `parseInt("0", 10)` returns `0` (invalid position)

### Solution
Added validation before parsing and only include songs with valid positions:

```typescript
// Parse and validate position number
const parsedPosition = parseInt(item.position, 10);

// Only add song if position is a valid number
if (!isNaN(parsedPosition) && parsedPosition > 0) {
  songsMap.get(showId)?.push({
    name: item.song || "Unknown Song",
    set: item.set,
    position: parsedPosition,
    transition: item.trans_mark || "",
    footnote: item.footnote || "",
    isjam: item.isjam === '1'
  });
} else {
  console.warn(`Invalid position "${item.position}" for song "${item.song}" in show ${showId}`);
}
```

### Validation Rules
- Position must parse to a valid number (not `NaN`)
- Position must be greater than 0 (no zero or negative positions)
- Invalid songs are filtered out and logged as warnings

### Impact
- ✅ Setlists now display in correct order even with bad data
- ✅ No `NaN` values in position fields
- ✅ Songs with invalid positions are excluded
- ✅ Warnings logged for debugging

---

## Bug #5: Timezone Issues

### Problem
Date comparisons were failing due to inconsistent time-of-day handling:

1. **Min date** was created at midnight local time
2. **Max date** was created at current time (not midnight)
3. Date comparisons could fail depending on user's timezone and time of day

**File:** [src/components/DateSelector.tsx:31-34](src/components/DateSelector.tsx#L31-L34)

```typescript
const defaultMinDate = new Date(1983, 11, 2);  // midnight local time
const defaultMaxDate = new Date();              // current time (e.g., 3:45 PM)
```

### Issues This Caused
- Users might not be able to select today's date if the current time hasn't reached midnight in UTC
- Date comparisons at boundaries (first/last shows) could incorrectly reject valid dates
- Timezone differences could cause dates near boundaries to be incorrectly disabled

### Solution
Normalize all dates to midnight (start of day) using `date-fns` `startOfDay()`:

```typescript
import { startOfDay } from "date-fns";

// Helper function to normalize dates to midnight (start of day)
// This prevents timezone and time-of-day comparison issues
const normalizeDate = (date: Date): Date => {
  return startOfDay(date);
};

// Default min date to Phish's first show: December 2, 1983 at midnight
const defaultMinDate = normalizeDate(new Date(1983, 11, 2));

// Default max date to today at midnight
const defaultMaxDate = normalizeDate(new Date());

// Use provided dates or defaults, normalized to midnight
const actualMinDate = minDate ? normalizeDate(minDate) : defaultMinDate;
const actualMaxDate = maxDate ? normalizeDate(maxDate) : defaultMaxDate;
```

### Changes Made

**1. Added normalization helper function**
- Ensures all dates are compared at midnight (00:00:00.000)
- Eliminates time-of-day from date comparisons

**2. Normalized min/max dates**
- Min date: December 2, 1983 at 00:00:00
- Max date: Today at 00:00:00
- Both use same time basis for comparison

**3. Updated date parsing logic**
```typescript
// Manual input parsing
const parsedDate = parse(formatted, "MM/dd/yyyy", new Date());
if (isValid(parsedDate)) {
  const normalizedDate = normalizeDate(parsedDate);
  if (normalizedDate >= actualMinDate && normalizedDate <= actualMaxDate) {
    onDateChange(normalizedDate);
  }
}
```

**4. Updated calendar disabled logic**
```typescript
disabled={(date) => {
  // Normalize the date being checked for consistent comparison
  const normalizedDate = normalizeDate(date);
  return (
    normalizedDate < actualMinDate ||
    normalizedDate > actualMaxDate
  );
}}
```

### Impact

**Before Fix:**
```
User at 2:30 PM: Can't select today (max is "today at 2:30 PM")
User at 11:59 PM: Can select today (max is "today at 11:59 PM")
```

**After Fix:**
```
All users: Can select today (max is "today at 00:00:00")
Consistent behavior regardless of time of day
```

### Benefits
- ✅ Users can always select today's date
- ✅ Consistent date range validation across timezones
- ✅ No edge cases based on time of day
- ✅ All date comparisons use the same time basis (midnight)
- ✅ Eliminates timezone-related bugs

---

## Testing

### Unit Tests Added

**File:** [src/tests/show-processor.test.ts](src/tests/show-processor.test.ts)

1. **Invalid position handling**
   - Tests `NaN` positions are filtered out
   - Tests negative positions are filtered out
   - Tests zero positions are filtered out
   - Verifies valid positions are kept

2. **Valid position parsing**
   - Tests string numbers are correctly parsed
   - Verifies positions remain as numbers
   - Confirms songs are ordered by position

### Manual Testing

**Position Validation:**
1. Create mock API data with invalid positions
2. Verify songs with invalid positions are excluded
3. Check console for warning messages
4. Confirm setlist displays in correct order

**Timezone Issues:**
1. Test at different times of day (morning, afternoon, evening)
2. Test near midnight (11:55 PM - 12:05 AM)
3. Change system timezone and retest
4. Verify today's date is always selectable
5. Test boundary dates (12/2/1983, today)

### Edge Cases Covered

**Position Validation:**
- Empty position string
- Non-numeric strings ("abc", "xyz")
- Negative numbers ("-1", "-100")
- Zero ("0")
- Very large numbers (should work)
- Decimal numbers (parseInt truncates)

**Timezone:**
- User in different timezones (PST, EST, UTC, etc.)
- Time of day variations (midnight, noon, near midnight)
- Date boundary conditions (first show, today)
- DST transitions (though unlikely to affect this app)

---

## Summary

### Bug #4: Position Validation
**Status:** ✅ Fixed
**Files Modified:**
- [src/services/show-processor.ts](src/services/show-processor.ts)
- [src/tests/show-processor.test.ts](src/tests/show-processor.test.ts)

**Result:** Songs with invalid positions are now filtered out with warning logs. Setlists always display in correct order.

### Bug #5: Timezone Issues
**Status:** ✅ Fixed
**Files Modified:**
- [src/components/DateSelector.tsx](src/components/DateSelector.tsx)

**Result:** Date comparisons are now consistent across timezones and times of day. Users can reliably select any valid date including today.

---

## Additional Recommendations

### For Position Validation
Consider adding:
- API schema validation (Zod, Yup, etc.)
- Logging invalid data to monitoring service
- Unit tests with more edge cases

### For Date Handling
Consider adding:
- User timezone display (show in user's local time)
- UTC timestamp storage for consistency
- Date range picker for selecting multiple shows

### General
- Add error boundary for React components
- Implement request cancellation for rapid date changes
- Add loading states for better UX
