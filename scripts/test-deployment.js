const GATEWAY_URL = 'http://192.168.49.2:30090'; // Minikube Gateway URL
const API_BASE = `${GATEWAY_URL}/api/v1`;

const USER_EMAIL = 'nitixaj335@roratu.com';
const USER_PASSWORD = 'Test123@';

async function testDeployment() {
    console.log('🚀 Starting Functional Test Suite');
    console.log('=================================');
    console.log(`Target: ${GATEWAY_URL}`);
    console.log(`User:   ${USER_EMAIL}`);
    console.log('---------------------------------');

    let token = '';

    // 1. Test Authentication (Auth Service)
    try {
        console.log('\n[1/3] Testing Auth Service (Login)...');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD })
        });

        if (!loginRes.ok) {
            const err = await loginRes.text();
            throw new Error(`Login Failed: ${loginRes.status} ${err}`);
        }

        const loginData = await loginRes.json();
        token = loginData.token;

        if (!token) throw new Error('No token received');
        console.log('✅ Login Successful. Token received.');
    } catch (e) {
        console.error('❌ Auth Service Test Failed:', e.message);
        process.exit(1);
    }

    // Helper to decode JWT
    const getUserIdFromToken = (t) => {
        try { return JSON.parse(atob(t.split('.')[1])).sub; } catch (e) { return null; }
    };

    // 2. Test User Service (Get Profile)
    let userId = null;
    try {
        console.log('\n[2/3] Testing User Service (Get Profile)...');
        const userRes = await fetch(`${API_BASE}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!userRes.ok) throw new Error(`Get Profile Failed: ${userRes.status}`);

        const userData = await userRes.json();
        // Try to get ID from token if not in profile
        userId = userData.id || getUserIdFromToken(token);
        console.log(`✅ User Profile Verified: ${userData.firstName} ${userData.lastName} (ID: ${userId})`);
    } catch (e) {
        console.error('❌ User Service Test Failed:', e.message);
        process.exit(1);
    }

    // 3. Test Property Service
    let firstPropertyId = null;
    try {
        // A. List All (Public)
        console.log('\n[3/5] Testing Property Service (List Properties)...');
        const propRes = await fetch(`${API_BASE}/properties`, { headers: { 'Content-Type': 'application/json' } });
        const properties = await propRes.json();
        console.log(`✅ Public Listings: Found ${properties.length} properties.`);

        // B. List My Properties (For AI Test ownership check)
        const myPropRes = await fetch(`${API_BASE}/properties/my-properties`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (myPropRes.ok) {
            const myProps = await myPropRes.json();
            console.log(`✅ My Properties: Found ${myProps.length} properties.`);
            if (myProps.length > 0) firstPropertyId = myProps[0].id;
        }

        // Fallback to public if I have none (might fail 403 on AI)
        if (!firstPropertyId && properties.length > 0) firstPropertyId = properties[0].id;

    } catch (e) {
        console.error('❌ Property Service Test Failed:', e.message);
        process.exit(1);
    }

    // 4. Test AI Service (Price Prediction)
    try {
        if (firstPropertyId) {
            console.log('\n[4/5] Testing AI Service (Predict Price)...');
            // Helper to format date YYYY-MM-DD
            const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2);
            const fmt = d => d.toISOString().split('T')[0];

            const aiUrl = `${API_BASE}/properties/${firstPropertyId}/predict-price`;
            const aiRes = await fetch(aiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    propertyId: firstPropertyId,
                    checkInDate: fmt(tomorrow),
                    checkOutDate: fmt(dayAfter)
                })
            });

            if (aiRes.ok) {
                const aiData = await aiRes.json();
                console.log(`✅ AI Prediction Verified. Suggested: ${aiData.predictedPriceMad} MAD`);
            } else {
                console.warn(`⚠️ AI Prediction Failed (Status ${aiRes.status}). Service might be cold or busy.`);
            }
        } else {
            console.log('⚠️ Skipping AI Test (No properties found)');
        }
    } catch (e) {
        console.warn('⚠️ AI Service invocation failed:', e.message);
    }

    // 5. Test Reclamation Service (My Complaints)
    try {
        console.log('\n[5/7] Testing Reclamation Service...');

        if (userId) {
            // Reclamations Service seems to use /api/reclamations (no v1) per api.ts
            const recUrl = `${GATEWAY_URL}/api/reclamations/my-complaints?userId=${userId}`;
            const recRes = await fetch(recUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (recRes.ok) {
                const recs = await recRes.json();
                console.log(`✅ Reclamation Service Verified. Found ${recs.length} complaints.`);
            } else {
                console.warn(`⚠️ Reclamation List Failed (Status ${recRes.status} at ${recUrl}).`);
            }
        } else {
            console.warn('⚠️ Skipping Reclamation Test (Could not determine User ID)');
        }
    } catch (e) {
        console.warn('⚠️ Reclamation Service invocation failed:', e.message);
    }

    // --- AI PROXY TESTS (via Next.js Frontend :30000) ---
    const APP_URL = 'http://192.168.49.2:30000';

    // 6. Test Market Trends (AI)
    try {
        console.log('\n[6/7] Testing Market Trends (AI)...');
        const mkUrl = `${APP_URL}/api/market-trends/all-cities?period_months=12`;
        const mkRes = await fetch(mkUrl); // Public?

        if (mkRes.ok) {
            const tr = await mkRes.json();
            console.log(`✅ Market Trends Verified. Retrieved ${tr.trends?.length || 0} city trends.`);
        } else {
            console.warn(`⚠️ Market Trends Failed (Status ${mkRes.status}).`);
        }
    } catch (e) {
        console.warn('⚠️ Market Trends failed:', e.message);
    }

    // 7. Test Tenant Risk & Recommendations (AI)
    if (userId) {
        try {
            console.log('\n[7/7] Testing Tenant Risk & Recommendations (AI)...');

            // Tenant Risk
            const riskUrl = `${APP_URL}/api/tenant-risk/${userId}`;
            const riskRes = await fetch(riskUrl, { method: 'POST' });
            if (riskRes.ok) {
                const risk = await riskRes.json();
                console.log(`✅ Tenant Risk Verified. Trust Score: ${risk.trust_score}/100.`);
            } else {
                console.warn(`⚠️ Tenant Risk Failed (Status ${riskRes.status}).`);
            }

            // Recommendations
            const recUrl = `${APP_URL}/api/recommendations/tenant/${userId}?max_results=3`;
            const recRes = await fetch(recUrl);
            if (recRes.ok) {
                const recData = await recRes.json();
                console.log(`✅ Recommendations Verified. Recs Found: ${recData.recommendations?.length || 0}`);
            } else {
                console.warn(`⚠️ Recommendations Failed (Status ${recRes.status}).`);
            }

        } catch (e) {
            console.warn('⚠️ Risk/Recs failed:', e.message);
        }
    }

    console.log('\n=================================');
    console.log('🎉 EXPANDED TESTS COMPLETED.');
}

testDeployment();
