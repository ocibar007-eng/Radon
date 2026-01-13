# E2E Test Suite - Zero Cost Validation

## Overview

This test suite validates the usePipeline V2 state machine integration with **zero API costs** by mocking all external API calls (Gemini, Firebase).

## Test Infrastructure Created

### 1. Test Assets (5 Realistic PDFs)
Location: `./test-assets/`

Generated medical report PDFs:
- `test_patient_01.pdf` - TC Crânio (João Silva)
- `test_patient_02.pdf` - RX Tórax (Maria Santos)  
- `test_patient_03.pdf` - US Abdominal (Pedro Oliveira)
- `test_patient_04.pdf` - RM Coluna (Ana Costa)
- `test_patient_05.pdf` - TC Abdome (Carlos Ferreira)

**Regenerate assets:** `node scripts/generate-test-assets.js`

### 2. ChaosPanel (Stress Testing Component)
Location: `src/components/debug/ChaosPanel.tsx`

Development-only component for simulating high-volume uploads:
- **Mock Mode**: Enabled by default (zero cost)
- **Scenarios**: 5, 20, or 50 simultaneous uploads
- **Visibility**: Only in dev mode (`import.meta.env.DEV`)

### 3. Playwright E2E Tests
Location: `e2e/full-scenario.spec.ts`

Three test scenarios:
1. **Bulk PDF Upload** - Upload 3 PDFs and verify processing
2. **ChaosPanel Stress Test** - Trigger 5 simulated uploads via UI
3. **Deduplication Test** - Upload same file 3x rapidly

All tests intercept Gemini/Firebase API calls and return mocked responses.

## Running the Tests

### Prerequisites
```bash
# Install dependencies (already done)
npm install

# Generate test PDFs (already done)
node scripts/generate-test-assets.js
```

### Option 1: Run with Auto-Server Start
```bash
npx playwright test e2e/full-scenario.spec.ts
```
⚠️ **Note**: This starts the dev server automatically, but may timeout on slow systems.

### Option 2: Manual Server Start (Recommended)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npx playwright test e2e/full-scenario.spec.ts --reporter=list
```

### View Test Results
```bash
# Open HTML report
npx playwright show-report
```

## Test Validation Checklist

### ✅ What Tests Validate

1. **Pipeline V2 Integration**
   - ✅ Queue accepts file inputs
   - ✅ State transitions (idle → active → processing)
   - ✅ Deduplication works (same file uploaded 3x = 1 job)

2. **UI Components**
   - ✅ ChaosPanel renders in dev mode
   - ✅ Mock mode checkbox functional
   - ✅ Stress test buttons trigger uploads

3. **Zero-Cost Mocking**
   - ✅ All Gemini API calls intercepted
   - ✅ All Firebase calls intercepted
   - ✅ No external API charges incurred

### ❌ What Tests Don't Validate

- **Real OCR Quality**: Mock responses return fixed text
- **Actual Retry Logic**: Mocked APIs always succeed
- **Network Failures**: No real 429/5xx errors simulated

## Manual Testing Checklist

For comprehensive validation, also test manually:

1. **ChaosPanel Smoke Test**
   - Run `npm run dev`
   - Look for orange "Chaos Panel" in bottom-right
   - Click "Simulate 5 Uploads"
   - Verify status changes to "Running..." then "Idle"

2. **Real Pipeline Test** (Costs API tokens!)
   - Upload a real PDF (not test assets)
   - Verify OCR extracts actual text
   - Check retry logic on network failure (disconnect WiFi mid-upload)

3. **Deduplication Test**
   - Upload same PDF 3 times rapidly
   - Verify only 1 document card appears
   - Check browser console for `[Pipeline] Item already processing` logs

## Troubleshooting

### Test Times Out
**Symptom**: `Error: Timed out waiting 60000ms from config.webServer`

**Solution**: Start dev server manually before running tests (Option 2 above)

### ChaosPanel Not Visible
**Symptom**: Test fails to find "Chaos Panel" text

**Solution**: Ensure running in dev mode (`NODE_ENV=development`)

### Screenshots Empty
**Symptom**: `e2e/screenshots/*.png` files are blank

**Solution**: Check that test assertions pass before screenshot capture

## Next Steps

### Phase 4: Production Validation
- [ ] Deploy to staging environment
- [ ] Run smoke tests with real patient data
- [ ] Monitor error rates in production
- [ ] Set up alerts for pipeline failures

### Future Enhancements
- Add visual regression testing (Percy/Chromatic)
- Integrate with CI/CD pipeline
- Add performance benchmarks (process 100 PDFs in <5min)
- Mock specific error scenarios (429 rate limits, 5xx servers down)
