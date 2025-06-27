// --- 1. Konfigurasi Awal ---
        const CLOUDINARY_CLOUD_NAME = 'ganti_dengan_cloud_name_anda'; // GANTI INI DENGAN NAMA CLOUD ASLI ANDA
        const CLOUDINARY_UPLOAD_PRESET = 'ganti_dengan_upload_preset_anda'; // GANTI INI DENGAN UPLOAD PRESET ASLI ANDA

        const firebaseConfig = {
            apiKey: "AIzaSyBVCynAyWLPqwhkEx4dR0k5J_OsL-0Q_rY",
            authDomain: "kasir-toko-70d61.firebaseapp.com",
            projectId: "kasir-toko-70d61",
            storageBucket: "kasir-toko-70d61.firebasestorage.app",
            messagingSenderId: "1057810583954",
            appId: "1:1057810583954:web:788e1058ad4a07eb84f14b"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        db.enablePersistence({ synchronizeTabs: true })
            .then(() => {
                console.log("Offline persistence enabled with multi-tab sync");
            })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("Offline persistence failed: Multiple tabs open or incompatible IndexedDB. Trying to clear IndexedDB and retry...", err);
                    if (window.indexedDB && window.indexedDB.deleteDatabase) {
                        try {
                            window.indexedDB.deleteDatabase(db.app.name);
                            alert("Database lokal telah dibersihkan karena masalah kompatibilitas. Silakan refresh halaman.");
                            location.reload();
                        } catch (deleteErr) {
                            console.error("Error deleting IndexedDB:", deleteErr);
                            alert("Gagal membersihkan IndexedDB. Coba hapus data situs di pengaturan browser Anda. (Error: " + deleteErr.message + ")");
                        }
                    } else {
                        console.warn("IndexedDB.deleteDatabase not supported, cannot clear local persistence.");
                        alert("Gagal mengaktifkan persistence offline. Aplikasi akan beroperasi dalam mode online saja. (Kode: failed-precondition)");
                    }
                } else if (err.code === 'unimplemented') {
                    console.warn("Offline persistence is not available in this browser. App will work in online mode only.");
                    alert("Persistence offline tidak tersedia di browser ini. Aplikasi hanya akan beroperasi dalam mode online.");
                } else {
                    console.error("Error enabling offline persistence:", err);
                    alert("Gagal mengaktifkan persistence offline. Aplikasi mungkin akan beroperasi dalam mode online saja. (Error: " + err.code + ")");
                }
            });

        const LOCAL_PRODUCTS_KEY = 'pos_products';
        const LOCAL_TRANSACTIONS_KEY = 'pos_transactions';
        const LOCAL_PENDING_KEY = 'pos_pending_transactions';
        const LOCAL_LAST_SYNC_KEY = 'pos_last_sync';

        // --- 2. Deklarasi Variabel Global ---
        let products = [];
        let transactions = [];
        let pendingTransactions = [];
        let settings = JSON.parse(localStorage.getItem('pos_settings')) || {
            storeName: 'Toko Maju Jaya',
            storeAddress: 'Jl. Raya No. 123, Bekasi',
            storePhone: '021-1234567',
            receiptFooter: 'Terima kasih atas kunjungan Anda!',
            printerPaperSize: '80mm',
            printPreview: 'yes',
            currencySymbol: 'Rp ',
            syncEnabled: true
        };

        let currentTransaction = {
            id: null,
            date: null,
            items: [],
            customerName: '',
            paymentMethod: 'cash',
            amountPaid: 0,
            change: 0,
            total: 0,
            profit: 0
        };

        let editingProductId = null;
        let currentProductView = 'list';
        let isOnline = navigator.onLine;
        let syncStatusElement = document.getElementById('syncStatus');
        let editingTransactionId = null;

        // --- 3. Deklarasi Elemen DOM (document.getElementById) ---
        const todaySalesElement = document.getElementById('today-sales');
        const todayProfitElement = document.getElementById('today-profit');
        const totalProductsElement = document.getElementById('total-products');
        const pendingTransactionsElement = document.getElementById('pending-transactions');
        const productSearchElement = document.getElementById('product-search');
        const productDisplayArea = document.getElementById('product-display-area');
        const productTableView = document.getElementById('product-table-view');
        const productGridView = document.getElementById('product-grid-view');
        const viewListBtn = document.getElementById('view-list-btn');
        const viewGridBtn = document.getElementById('view-grid-btn');
        const productListElement = document.getElementById('product-list');
        const transactionItemsElement = document.getElementById('transaction-items');
        const transactionTotalElement = document.getElementById('transaction-total');
        const savePendingBtn = document.getElementById('save-pending');
        const processPaymentBtn = document.getElementById('process-payment');
        const showPendingBtn = document.getElementById('show-pending');
        const pendingCountElement = document.getElementById('pending-count');
        const productForm = document.getElementById('product-form');
        const productIdHidden = document.getElementById('product-id-hidden');
        const productNameInput = document.getElementById('product-name');
        const productBuyPriceInput = document.getElementById('product-buy-price');
        const productSellPriceInput = document.getElementById('product-sell-price');
        const productStockInput = document.getElementById('product-stock');
        const productImageUpload = document.getElementById('product-image-upload');
        const productImagePreview = document.querySelector('#product-image-preview img');
        const productImagePreviewContainer = document.getElementById('product-image-preview');
        const saveProductBtn = document.getElementById('save-product-btn');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const productTableBody = document.getElementById('product-table-body');
        const productListSearch = document.getElementById('product-list-search');
        const reportStartDate = document.getElementById('report-start-date');
        const reportEndDate = document.getElementById('report-end-date');
        const reportProductFilter = document.getElementById('report-product-filter');
        const generateReportBtn = document.getElementById('generate-report');
        const downloadReportPdfBtn = document.getElementById('download-report-pdf');
        const reportTotalSales = document.getElementById('report-total-sales');
        const reportTotalPurchases = document.getElementById('report-total-purchases');
        const reportGrossProfit = document.getElementById('report-gross-profit');
        const reportTransactions = document.getElementById('report-transactions');
        const reportItemProfitTable = document.getElementById('report-item-profit-table');
        const reportStockTable = document.getElementById('report-stock-table');
        const backupProductsCheckbox = document.getElementById('backup-products');
        const backupTransactionsCheckbox = document.getElementById('backup-transactions');
        const backupPendingCheckbox = document.getElementById('backup-pending');
        const backupBtn = document.getElementById('backup-data');
        const restoreFile = document.getElementById('restore-file');
        const restoreBtn = document.getElementById('restore-data');
        const pendingModal = new bootstrap.Modal(document.getElementById('pendingModal'));
        const pendingTransactionsList = document.getElementById('pending-transactions-list');
        const pendingCustomerNameInput = document.getElementById('pending-customer-name');
        const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
        const receiptContent = document.getElementById('receipt-content');
        const printReceiptBtn = document.getElementById('print-receipt');
        const shareReceiptImageBtn = document.getElementById('share-receipt-image');
        const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        const paymentModalTotal = document.getElementById('payment-modal-total');
        const paymentMethodElement = document.getElementById('payment-method');
        const customerNameElement = document.getElementById('customer-name');
        const amountPaidElement = document.getElementById('amount-paid');
        const changeAmountElement = document.getElementById('change-amount');
        const completePaymentBtn = document.getElementById('complete-payment');
        const historyList = document.getElementById('history-list');
        const storeNameInput = document.getElementById('store-name');
        const storeAddressInput = document.getElementById('store-address');
        const storePhoneInput = document.getElementById('store-phone');
        const receiptFooterInput = document.getElementById('receipt-footer');
        const storeSettingsForm = document.getElementById('store-settings-form');
        const printerPaperSizeSelect = document.getElementById('printer-paper-size');
        const printPreviewSelect = document.getElementById('print-preview');
        const savePrinterSettingsBtn = document.getElementById('save-printer-settings');
        const currencySymbolInput = document.getElementById('currency-symbol');
        const saveOtherSettingsBtn = document.getElementById('save-other-settings');
        const quickSalesBtn = document.getElementById('quick-sales');
        const quickAddProductBtn = document.getElementById('quick-add-product');

        // --- 4. DEFINISI SEMUA FUNGSI ANDA DI SINI ---

        // Fungsi Helper umum
        function updateSyncStatus() {
            if (isOnline) {
                syncStatusElement.innerHTML = '<i class="bi bi-wifi"></i> Online Mode';
                syncStatusElement.className = 'sync-status online';
            } else {
                syncStatusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Offline Mode';
                syncStatusElement.className = 'sync-status offline';
            }
        }

        function generateId() {
            return 'local_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000);
        }

        function mergeArrays(localArray, serverArray, idKey) {
            const merged = [];
            const allIds = new Set([
                ...localArray.map(item => item[idKey]),
                ...serverArray.map(item => item[idKey])
            ]);

            allIds.forEach(id => {
                const localItem = localArray.find(item => item[idKey] === id);
                const serverItem = serverArray.find(item => item[idKey] === id);

                if (serverItem) {
                    if (!localItem || localItem.id.startsWith('local_') || (serverItem.updatedAt && localItem.updatedAt && new Date(serverItem.updatedAt) > new Date(localItem.updatedAt))) {
                         merged.push(serverItem);
                    } else {
                        merged.push(localItem);
                    }
                } else if (localItem) {
                    merged.push(localItem);
                }
            });
            return merged;
        }

        function formatCurrency(amount) {
            return settings.currencySymbol + parseFloat(amount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }

        function formatNumberForInput(amount) {
            return parseFloat(amount).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }

        function getPaymentMethodName(method) {
            const methods = {
                'cash': 'Tunai',
                'debit': 'Kartu Debit',
                'credit': 'Kartu Kredit',
                'transfer': 'Transfer Bank'
            };
            return methods[method] || method;
        }

        function resetCurrentTransaction() {
            currentTransaction = {
                id: generateId(),
                date: null,
                items: [],
                customerName: '',
                paymentMethod: 'cash',
                amountPaid: 0,
                change: 0,
                total: 0,
                profit: 0
            };
            paymentMethodElement.value = 'cash';
            customerNameElement.value = '';
            amountPaidElement.value = '0';
            changeAmountElement.textContent = '0';
            pendingCustomerNameInput.value = '';
            updateTransactionDisplay();
        }

        function updatePendingCount() {
            pendingCountElement.textContent = pendingTransactions.length;
        }

        function calculateChange() {
            const amountPaid = parseFloat(amountPaidElement.value.replace(/[^0-9.]/g,"")) || 0;
            const change = amountPaid - currentTransaction.total;
            currentTransaction.amountPaid = amountPaid;
            currentTransaction.change = change > 0 ? change : 0;
            currentTransaction.paymentMethod = paymentMethodElement.value;
            currentTransaction.customerName = customerNameElement.value;
            changeAmountElement.textContent = formatCurrency(currentTransaction.change);
        }

        // Fungsi Sinkronisasi
        async function syncData() {
            if (!isOnline || !settings.syncEnabled) {
                console.log("Sync skipped: offline or sync disabled.");
                return;
            }

            console.log('Initiating data sync...');
            try {
                syncStatusElement.innerHTML = '<i class="bi bi-arrow-repeat"></i> Syncing...';
                syncStatusElement.className = 'sync-status syncing';

                // Sync products
                let localProducts = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY)) || [];
                const productsCol = db.collection('products');
                const serverSnapshot = await productsCol.get();
                const serverProducts = serverSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const mergedProducts = [];
                const serverProductMap = new Map(serverProducts.map(p => [p.id, p]));

                for (const localProduct of localProducts) {
                    const serverProduct = serverProductMap.get(localProduct.id);
                    if (serverProduct) {
                        mergedProducts.push(serverProduct);
                        serverProductMap.delete(localProduct.id);
                    } else {
                        mergedProducts.push(localProduct);
                    }
                }
                for (const serverProduct of serverProductMap.values()) {
                    mergedProducts.push(serverProduct);
                }
                products = mergedProducts;
                localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));

                const batch = db.batch();
                let productsToUpload = 0;
                for (const product of products) {
                    const docRef = productsCol.doc(product.id);
                    batch.set(docRef, product);
                    productsToUpload++;
                }
                if (productsToUpload > 0) {
                    await batch.commit();
                    console.log(`Synced ${productsToUpload} products.`);
                }

                // Sync transactions
                let localTransactions = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY)) || [];
                const transactionsCol = db.collection('transactions');
                const serverTransactionsSnapshot = await transactionsCol.orderBy('date', 'desc').get();
                const serverTransactions = serverTransactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const mergedTransactions = [];
                const serverTransactionMap = new Map(serverTransactions.map(t => [t.id, t]));

                for (const localTransaction of localTransactions) {
                    const serverTransaction = serverTransactionMap.get(localTransaction.id);
                    if (serverTransaction) {
                        mergedTransactions.push(serverTransaction);
                        serverTransactionMap.delete(localTransaction.id);
                    } else {
                        mergedTransactions.push(localTransaction);
                    }
                }
                for (const serverTransaction of serverTransactionMap.values()) {
                    mergedTransactions.push(serverTransaction);
                }
                transactions = mergedTransactions;
                localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));

                const transactionsBatch = db.batch();
                let transactionsToUpload = 0;
                for (const transaction of transactions) {
                    const docRef = transactionsCol.doc(transaction.id);
                    transactionsBatch.set(docRef, transaction);
                    transactionsToUpload++;
                }
                if (transactionsToUpload > 0) {
                    await transactionsBatch.commit();
                    console.log(`Synced ${transactionsToUpload} transactions.`);
                }

                // Sync pending transactions
                let localPending = JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY)) || [];
                const pendingCol = db.collection('pendingTransactions');
                const serverPendingSnapshot = await pendingCol.get();
                const serverPending = serverPendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const mergedPending = [];
                const serverPendingMap = new Map(serverPending.map(p => [p.id, p]));

                for (const localP of localPending) {
                    const serverP = serverPendingMap.get(localP.id);
                    if (serverP) {
                        mergedPending.push(serverP);
                        serverPendingMap.delete(localP.id);
                    } else {
                        mergedPending.push(localP);
                    }
                }
                for (const serverP of serverPendingMap.values()) {
                    mergedPending.push(serverP);
                }
                pendingTransactions = mergedPending;
                localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(pendingTransactions));

                const pendingBatch = db.batch();
                let pendingToUpload = 0;
                for (const pending of pendingTransactions) {
                    const docRef = pendingCol.doc(pending.id);
                    pendingBatch.set(docRef, pending);
                    pendingToUpload++;
                }
                if (pendingToUpload > 0) {
                    await pendingBatch.commit();
                    console.log(`Synced ${pendingToUpload} pending transactions.`);
                }

                localStorage.setItem(LOCAL_LAST_SYNC_KEY, new Date().toISOString());

                // Setelah sync, refresh data untuk memastikan konsistensi UI
                await fetchProducts();
                await fetchTransactions();
                await fetchPendingTransactions();

                syncStatusElement.innerHTML = '<i class="bi bi-wifi"></i> Online Mode';
                syncStatusElement.className = 'sync-status online';
                console.log('Data synced successfully.');
            } catch (error) {
                console.error('Error during syncData:', error);
                syncStatusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Offline Mode (Sync Error)';
                syncStatusElement.className = 'sync-status offline';
                alert("Terjadi kesalahan saat sinkronisasi data. Aplikasi beroperasi dalam mode offline. Detail: " + error.message);
            }
        }

        // Fungsi Fetch data dari Firebase/Local Storage
        async function fetchProducts() {
            try {
                if (isOnline && settings.syncEnabled) {
                    const productsCol = db.collection('products');
                    const snapshot = await productsCol.get({ source: 'server' });
                    products = snapshot.docs.map(doc => {
                        const data = doc.data();
                        data.buyPrice = parseFloat(data.buyPrice) || 0;
                        data.sellPrice = parseFloat(data.sellPrice) || 0;
                        data.stock = parseInt(data.stock) || 0;
                        return { id: doc.id, ...data };
                    });
                    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
                    console.log("Produk berhasil diambil dari Firebase.");
                } else {
                    products = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY)) || [];
                    products.forEach(p => { // Ensure numbers even from local storage
                        p.buyPrice = parseFloat(p.buyPrice) || 0;
                        p.sellPrice = parseFloat(p.sellPrice) || 0;
                        p.stock = parseInt(p.stock) || 0;
                    });
                    console.log('Menggunakan data produk lokal.');
                }
                loadProducts(productSearchElement.value, currentProductView);
                populateProductFilterDropdown();
                loadDashboard();
            } catch (error) {
                console.error("Error fetching products:", error);
                products = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY)) || [];
                products.forEach(p => { // Ensure numbers even from local storage
                    p.buyPrice = parseFloat(p.buyPrice) || 0;
                    p.sellPrice = parseFloat(p.sellPrice) || 0;
                    p.stock = parseInt(p.stock) || 0;
                });
                loadProducts(productSearchElement.value, currentProductView);
                populateProductFilterDropdown();
                loadDashboard();
                alert("Gagal memuat produk dari database. Menggunakan data lokal. (Error: " + error.message + ")");
            }
        }

        async function fetchTransactions() {
            try {
                if (isOnline && settings.syncEnabled) {
                    const transactionsCol = db.collection('transactions');
                    const snapshot = await transactionsCol.orderBy('date', 'desc').get({ source: 'server' });
                    
                    transactions = snapshot.docs.map(doc => {
                        const data = doc.data();
                        // Handle Firebase Timestamp
                        if (data.date && typeof data.date.toDate === 'function') {
                            data.date = data.date.toDate().toISOString();
                        } else if (data.date) {
                            const dateObject = new Date(data.date);
                            if (!isNaN(dateObject.getTime())) {
                                data.date = dateObject.toISOString();
                            } else {
                                console.warn("Transaksi dengan ID", doc.id, "memiliki nilai tanggal tidak valid (bukan Timestamp atau format salah):", data.date);
                                data.date = null;
                            }
                        } else {
                            data.date = null;
                        }
                        return { id: doc.id, ...data };
                    }).filter(t => t.date !== null);

                    localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
                    console.log("Transaksi berhasil diambil dari Firebase.");
                } else {
                    transactions = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY)) || [];
                    transactions = transactions.filter(t => {
                        if (t.date && typeof t.date.toDate === 'function') {
                            t.date = t.date.toDate().toISOString();
                        } else if (t.date) {
                            const dateObject = new Date(t.date);
                            if (!isNaN(dateObject.getTime())) {
                                t.date = dateObject.toISOString();
                            } else {
                                console.warn("Transaksi lokal dengan ID", t.id, "memiliki nilai tanggal tidak valid:", t.date);
                                return false;
                            }
                        } else {
                            return false;
                        }
                        return true;
                    });
                    console.log('Menggunakan data transaksi lokal.');
                }
                loadHistory();
                loadDashboard();
            } catch (error) {
                console.error("Error fetching transactions:", error);
                transactions = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY)) || [];
                transactions = transactions.filter(t => {
                    const dateValue = t.date;
                    if (!dateValue) return false;
                    const dateObject = new Date(dateValue);
                    return !isNaN(dateObject.getTime());
                });
                localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
                
                loadHistory();
                loadDashboard();
                alert("Gagal memuat transaksi dari database. Menggunakan data lokal. (Error: " + error.message + ")");
            }
        }

        async function fetchPendingTransactions() {
            try {
                if (isOnline && settings.syncEnabled) {
                    const pendingCol = db.collection('pendingTransactions');
                    const snapshot = await pendingCol.get({ source: 'server' });
                    
                    pendingTransactions = snapshot.docs.map(doc => {
                        const data = doc.data();
                        // Handle Firebase Timestamp
                        if (data.date && typeof data.date.toDate === 'function') {
                            data.date = data.date.toDate().toISOString();
                        } else if (data.date) {
                            const dateObject = new Date(data.date);
                            if (!isNaN(dateObject.getTime())) {
                                data.date = dateObject.toISOString();
                            } else {
                                console.warn("Transaksi pending dengan ID", doc.id, "memiliki nilai tanggal tidak valid (bukan Timestamp atau format salah):", data.date);
                                data.date = null;
                            }
                        } else {
                            data.date = null;
                        }
                        return { id: doc.id, ...data };
                    }).filter(t => t.date !== null);

                    localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(pendingTransactions));
                    console.log("Transaksi pending berhasil diambil dari Firebase.");
                } else {
                    pendingTransactions = JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY)) || [];
                    pendingTransactions = pendingTransactions.filter(t => {
                        if (t.date && typeof t.date.toDate === 'function') {
                            t.date = t.date.toDate().toISOString();
                        } else if (t.date) {
                            const dateObject = new Date(t.date);
                            if (!isNaN(dateObject.getTime())) {
                                t.date = dateObject.toISOString();
                            } else {
                                console.warn("Transaksi pending lokal dengan ID", t.id, "memiliki nilai tanggal tidak valid:", t.date);
                                return false;
                            }
                        } else {
                            return false;
                        }
                        return true;
                    });
                    console.log('Menggunakan data transaksi pending lokal.');
                }
                updatePendingCount();
                loadDashboard();
            } catch (error) {
                console.error("Error fetching pending transactions:", error);
                pendingTransactions = JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY)) || [];
                pendingTransactions = pendingTransactions.filter(t => {
                    const dateValue = t.date;
                    if (!dateValue) return false;
                    const dateObject = new Date(dateValue);
                    return !isNaN(dateObject.getTime());
                });
                localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(pendingTransactions));

                updatePendingCount();
                loadDashboard();
                alert("Gagal memuat transaksi pending dari database. Menggunakan data lokal. (Error: " + error.message + ")");
            }
        }

        // Fungsi Save/Delete data ke Firebase/Local Storage
        async function saveProductToFirestore(productData, productId = null) {
            try {
                productData.updatedAt = new Date().toISOString();

                let currentId = productId;
                if (!currentId) {
                    currentId = generateId();
                    productData.createdAt = new Date().toISOString();
                } else {
                    const existingProduct = products.find(p => p.id === currentId);
                    if (existingProduct) {
                        productData.createdAt = existingProduct.createdAt || new Date().toISOString();
                    } else {
                        productData.createdAt = new Date().toISOString();
                    }
                }
                
                let localProducts = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY)) || [];
                const existingIndex = localProducts.findIndex(p => p.id === currentId);
                if (existingIndex !== -1) {
                    localProducts[existingIndex] = { ...localProducts[existingIndex], ...productData, id: currentId };
                } else {
                    localProducts.push({ ...productData, id: currentId });
                }
                localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(localProducts));


                if (isOnline && settings.syncEnabled) {
                    try {
                        const productsCol = db.collection('products');
                        await productsCol.doc(currentId).set(productData, { merge: true });
                        console.log("Produk berhasil disimpan ke Firebase:", currentId);
                    } catch (firebaseErr) {
                        console.error("Firebase Error: Gagal menyimpan produk ke Firestore. Akan tetap di lokal:", firebaseErr);
                        alert("Gagal menyimpan produk ke Firebase. Data akan tetap disimpan secara lokal. Error: " + firebaseErr.message);
                        return false; // Mengembalikan false jika penyimpanan Firebase gagal
                    }
                } else {
                    console.log("Offline: Produk disimpan ke penyimpanan lokal saja.");
                    alert("Produk disimpan secara lokal karena tidak ada koneksi internet atau sinkronisasi dinonaktifkan.");
                }

                await fetchProducts();
                return true;
            } catch (error) {
                console.error("Critical Error in saveProductToFirestore:", error);
                alert("Terjadi kesalahan fatal saat menyimpan produk. Periksa konsol untuk detail: " + error.message);
                return false;
            }
        }

        async function deleteProductFromFirestore(productId) {
            try {
                let localProducts = JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY)) || [];
                localProducts = localProducts.filter(p => p.id !== productId);
                localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(localProducts));

                if (isOnline && settings.syncEnabled) {
                    try {
                        await db.collection('products').doc(productId).delete();
                        console.log("Produk berhasil dihapus dari Firebase:", productId);
                    } catch (firebaseErr) {
                        console.error("Firebase Error: Gagal menghapus produk dari Firestore. Akan tetap di lokal:", firebaseErr);
                        alert("Gagal menghapus produk dari Firebase. Data akan tetap dihapus secara lokal. Error: " + firebaseErr.message);
                        return false;
                    }
                } else {
                    console.log("Offline: Produk dihapus dari penyimpanan lokal saja.");
                    alert("Produk dihapus secara lokal karena tidak ada koneksi internet atau sinkronisasi dinonaktifkan.");
                }
                await fetchProducts();
                return true;
            } catch (error) {
                console.error("Critical Error in deleteProductFromFirestore:", error);
                alert("Terjadi kesalahan fatal saat menghapus produk. Periksa konsol untuk detail: " + error.message);
                return false;
            }
        }

        async function saveTransactionToFirestore(transactionData) {
            try {
                transactionData.id = transactionData.id || generateId();
                transactionData.date = transactionData.date || new Date().toISOString();
                transactionData.updatedAt = new Date().toISOString();

                const localTransactions = JSON.parse(localStorage.getItem(LOCAL_TRANSACTIONS_KEY)) || [];
                localTransactions.push(transactionData);
                localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(localTransactions));

                if (isOnline && settings.syncEnabled) {
                    try {
                        await db.collection('transactions').doc(transactionData.id).set(transactionData);
                        console.log("Transaksi berhasil disimpan ke Firebase:", transactionData.id);
                    } catch (firebaseErr) {
                        console.error("Firebase Error: Gagal menyimpan transaksi ke Firestore. Akan tetap di lokal:", firebaseErr);
                        alert("Gagal menyimpan transaksi ke Firebase. Data akan tetap disimpan secara lokal. Error: " + firebaseErr.message);
                        return false;
                    }
                } else {
                    console.log("Offline: Transaksi disimpan ke penyimpanan lokal saja.");
                    alert("Transaksi disimpan secara lokal karena tidak ada koneksi internet atau sinkronisasi dinonaktifkan.");
                }
                await fetchTransactions();
                return true;
            } catch (error) {
                console.error("Critical Error in saveTransactionToFirestore:", error);
                alert("Terjadi kesalahan fatal saat menyimpan transaksi. Periksa konsol untuk detail: " + error.message);
                return false;
            }
        }

        async function savePendingTransactionToFirestore(transactionData, pendingId = null) {
            try {
                let currentId = pendingId;
                if (!currentId) {
                    currentId = generateId();
                    transactionData.date = new Date().toISOString();
                }
                transactionData.updatedAt = new Date().toISOString();

                const localPending = JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY)) || [];
                const existingIndex = localPending.findIndex(t => t.id === currentId);

                if (existingIndex !== -1) {
                    localPending[existingIndex] = { ...localPending[existingIndex], ...transactionData, id: currentId };
                } else {
                    localPending.push({ ...transactionData, id: currentId });
                }
                localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(localPending));

                if (isOnline && settings.syncEnabled) {
                    try {
                        const pendingCol = db.collection('pendingTransactions');
                        await pendingCol.doc(currentId).set(transactionData, { merge: true });
                        console.log("Transaksi pending berhasil disimpan ke Firebase:", currentId);
                    } catch (firebaseErr) {
                        console.error("Firebase Error: Gagal menyimpan transaksi pending ke Firestore. Akan tetap di lokal:", firebaseErr);
                        alert("Gagal menyimpan transaksi pending ke Firebase. Data akan tetap disimpan secara lokal. Error: " + firebaseErr.message);
                        return false;
                    }
                } else {
                    console.log("Offline: Transaksi pending disimpan ke penyimpanan lokal saja.");
                    alert("Transaksi pending disimpan secara lokal karena tidak ada koneksi internet atau sinkronisasi dinonaktifkan.");
                }
                await fetchPendingTransactions();
                return true;
            } catch (error) {
error("Critical Error in savePendingTransactionToFirestore:", error);
                alert("Terjadi kesalahan fatal saat menyimpan transaksi pending. Periksa konsol untuk detail: " + error.message);
                return false;
            }
        }

        async function deletePendingTransactionFromFirestore(pendingId) {
            try {
                let localPending = JSON.parse(localStorage.getItem(LOCAL_PENDING_KEY)) || [];
                localPending = localPending.filter(t => t.id !== pendingId);
                localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(localPending));

                if (isOnline && settings.syncEnabled) {
                    try {
                        await db.collection('pendingTransactions').doc(pendingId).delete();
                        console.log("Transaksi pending berhasil dihapus dari Firebase:", pendingId);
                    } catch (firebaseErr) {
                        console.error("Firebase Error: Gagal menghapus transaksi pending dari Firestore. Akan tetap di lokal:", firebaseErr);
                        alert("Gagal menghapus transaksi pending dari Firebase. Data akan tetap dihapus secara lokal. Error: " + firebaseErr.message);
                        return false;
                    }
                } else {
                    console.log("Offline: Transaksi pending dihapus dari penyimpanan lokal saja.");
                    alert("Transaksi pending dihapus secara lokal karena tidak ada koneksi internet atau sinkronisasi dinonaktifkan.");
                }
                await fetchPendingTransactions();
                return true;
            } catch (error) {
                console.error("Critical Error in deletePendingTransactionFromFirestore:", error);
                alert("Terjadi kesalahan fatal saat menghapus transaksi pending. Periksa konsol untuk detail: " + error.message);
                return false;
            }
        }

        // Fungsi Pemuatan UI
        function loadDashboard() {
            const today = new Date().toISOString().split('T')[0];

            const todayTransactions = transactions.filter(t => {
                if (!t || !t.date) {
                    console.warn("Melewatkan transaksi karena objek atau tanggal tidak valid:", t);
                    return false;
                }
                const transactionDate = new Date(t.date);
                if (isNaN(transactionDate.getTime())) {
                    console.warn("Melewatkan transaksi karena nilai tanggal tidak valid:", t.date);
                    return false;
                }
                return transactionDate.toISOString().split('T')[0] === today;
            });
            const todaySales = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
            const todayProfit = todayTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

            todaySalesElement.textContent = formatCurrency(todaySales);
            todayProfitElement.textContent = formatCurrency(todayProfit);
            totalProductsElement.textContent = products.length;
            pendingTransactionsElement.textContent = pendingTransactions.length;
        }

        function loadProducts(searchTerm = '', view = 'list') {
            currentProductView = view;

            productListElement.innerHTML = '';
            productGridView.innerHTML = '';

            const filteredProducts = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()));

            if (filteredProducts.length === 0) {
                if (view === 'list') {
                    productTableView.style.display = 'block';
                    productGridView.style.display = 'none';
                    productListElement.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada produk</td></tr>';
                } else {
                    productTableView.style.display = 'none';
                    productGridView.style.display = 'grid';
                    productGridView.innerHTML = '<p class="text-center w-100">Tidak ada produk</p>';
                }
                productTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada produk</td></tr>';
                return;
            }

            if (view === 'list') {
                productTableView.style.display = 'block';
                productGridView.style.display = 'none';
                filteredProducts.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.name}</td>
                        <td>${formatCurrency(product.sellPrice)}</td>
                        <td>${product.stock}</td>
                        <td>
                            <button class="btn btn-sm btn-primary add-to-cart" data-id="${product.id}">
                                <i class="bi bi-cart-plus"></i> Tambah
                            </button>
                        </td>
                    `;
                    productListElement.appendChild(row);
                });
            } else {
                productTableView.style.display = 'none';
                productGridView.style.display = 'grid';
                filteredProducts.forEach(product => {
                    const card = document.createElement('div');
                    card.classList.add('product-card');
                    card.innerHTML = `
                        <div class="product-card-img-container">
                            ${product.image ? `<img src="${product.image}" class="product-card-img" alt="${product.name}">` : '<i class="bi bi-image-fill text-muted fs-1"></i>'}
                        </div>
                        <div class="product-card-body">
                            <h6>${product.name}</h6>
                            <p class="text-primary fw-bold mb-1">${formatCurrency(product.sellPrice)}</p>
                            <p class="small text-muted mb-2">Stok: ${product.stock}</p>
                            <button class="btn btn-primary add-to-cart" data-id="${product.id}">
                                <i class="bi bi-cart-plus"></i> Tambah
                            </button>
                        </div>
                    `;
                    productGridView.appendChild(card);
                });
            }

            productTableBody.innerHTML = '';
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        ${product.image ? `<img src="${product.image}" class="product-img" alt="${product.name}">` : '<i class="bi bi-image text-muted"></i>'}
                    </td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.buyPrice)}</td>
                    <td>${formatCurrency(product.sellPrice)}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1 edit-product" data-id="${product.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                productTableBody.appendChild(row);
            });

            document.querySelectorAll('.add-to-cart').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    addToCart(productId);
                });
            });

            document.querySelectorAll('.edit-product').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    editProduct(productId);
                });
            });

            document.querySelectorAll('.delete-product').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    deleteProduct(productId);
                });
            });
        }

        function loadHistory() {
            historyList.innerHTML = '';

            if (transactions.length === 0) {
                historyList.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada transaksi</td></tr>';
                return;
            }

            transactions.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="transaction-id">#${transaction.id}</td>
                    
                    <td class="transaction-date">${transaction.date ? new Date(transaction.date).toLocaleString('id-ID') : 'Tanggal Tidak Valid'}</td>
                    <td class="transaction-items">${transaction.items.length} items</td>
                    <td class="transaction-total">${formatCurrency(transaction.total)}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-receipt" data-id="${transaction.id}">
                            <i class="bi bi-receipt"></i> Lihat
                        </button>
                        <button class="btn btn-sm btn-warning ms-1 edit-history-btn" data-id="${transaction.id}">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        </td>
                `;
                historyList.appendChild(row);
            });

            document.querySelectorAll('.view-receipt').forEach(btn => {
                btn.addEventListener('click', function() {
                    const transactionId = this.getAttribute('data-id');
                    viewReceipt(transactionId);
                });
            });

            document.querySelectorAll('.edit-history-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const transactionId = this.getAttribute('data-id');
                    editHistory(transactionId);
                });
            });
        }

        function loadPendingTransactions() {
            pendingTransactionsList.innerHTML = '';

            if (pendingTransactions.length === 0) {
                pendingTransactionsList.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada transaksi pending</td></tr>';
                return;
            }

            pendingTransactions.forEach((transaction, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>#${transaction.id}</td>
                    <td>${transaction.date ? new Date(transaction.date).toLocaleString('id-ID') : 'Tanggal Tidak Valid'}</td>
                    <td>${transaction.customerName || '-'}</td>
                    <td>${transaction.items.length} items</td>
                    <td>${formatCurrency(transaction.total)}</td>
                    <td>
                        <button class="btn btn-sm btn-success me-1 load-pending" data-id="${transaction.id}">
                            <i class="bi bi-cart-check"></i> Muat
                        </button>
                        <button class="btn btn-sm btn-danger delete-pending" data-id="${transaction.id}">
                            <i class="bi bi-trash"></i> Hapus
                        </button>
                    </td>
                `;
                pendingTransactionsList.appendChild(row);
            });

            document.querySelectorAll('.load-pending').forEach(btn => {
                btn.addEventListener('click', function() {
                    const pendingId = this.getAttribute('data-id');
                    loadPendingTransaction(pendingId);
                });
            });

            document.querySelectorAll('.delete-pending').forEach(btn => {
                btn.addEventListener('click', function() {
                    const pendingId = this.getAttribute('data-id');
                    deletePendingTransaction(pendingId);
                });
            });
        }

        function loadPendingTransaction(pendingId) {
            const pendingItem = pendingTransactions.find(p => p.id === pendingId);
            if (!pendingItem) {
                console.error("Pending item not found for ID:", pendingId);
                return;
            }

            currentTransaction = JSON.parse(JSON.stringify(pendingItem));
            currentTransaction.id = generateId();

            deletePendingTransactionFromFirestore(pendingId)
                .then(success => {
                    if (success) {
                        updateTransactionDisplay();
                        pendingModal.hide();
                        alert('Transaksi pending berhasil dimuat!');
                    } else {
                        alert('Gagal menghapus transaksi pending asli setelah memuat.');
                    }
                })
                .catch(error => {
                    console.error("Error loading and deleting pending transaction:", error);
                    alert('Terjadi kesalahan saat memuat dan menghapus transaksi pending: ' + error.message);
                });
        }

        function loadSettings() {
            storeNameInput.value = settings.storeName;
            storeAddressInput.value = settings.storeAddress;
            storePhoneInput.value = settings.storePhone;
            receiptFooterInput.value = settings.receiptFooter;
            printerPaperSizeSelect.value = settings.printerPaperSize;
            printPreviewSelect.value = settings.printPreview;
            currencySymbolInput.value = settings.currencySymbol;

            const syncToggleContainer = document.createElement('div');
            syncToggleContainer.className = 'mb-3 form-check form-switch';
            syncToggleContainer.innerHTML = `
                <input class="form-check-input" type="checkbox" id="sync-enabled" ${settings.syncEnabled ? 'checked' : ''}>
                <label class="form-check-label" for="sync-enabled">Sinkronisasi Online (Membutuhkan Firebase)</label>
            `;
            const cardBodySettings = document.querySelector('#settings .card-body');
            if (!cardBodySettings.querySelector('#sync-enabled')) {
                 cardBodySettings.insertBefore(syncToggleContainer, cardBodySettings.firstChild);
            }

            document.getElementById('sync-enabled').addEventListener('change', function() {
                settings.syncEnabled = this.checked;
                localStorage.setItem('pos_settings', JSON.stringify(settings));
                if (this.checked && isOnline) {
                    syncData();
                } else if (!this.checked) {
                    alert("Sinkronisasi online dinonaktifkan. Data hanya akan disimpan secara lokal.");
                }
            });
        }

        // Fungsi Pemuatan UI
        function loadProducts(searchTerm = '', view = 'list') {
            currentProductView = view;

            productListElement.innerHTML = '';
            productGridView.innerHTML = '';

            const filteredProducts = products.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()));

            if (filteredProducts.length === 0) {
                if (view === 'list') {
                    productTableView.style.display = 'block';
                    productGridView.style.display = 'none';
                    productListElement.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada produk</td></tr>';
                } else {
                    productTableView.style.display = 'none';
                    productGridView.style.display = 'grid';
                    productGridView.innerHTML = '<p class="text-center w-100">Tidak ada produk</p>';
                }
                productTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada produk</td></tr>';
                return;
            }

            if (view === 'list') {
                productTableView.style.display = 'block';
                productGridView.style.display = 'none';
                filteredProducts.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.name}</td>
                        <td>${formatCurrency(product.sellPrice)}</td>
                        <td>${product.stock}</td>
                        <td>
                            <button class="btn btn-sm btn-primary add-to-cart" data-id="${product.id}">
                                <i class="bi bi-cart-plus"></i> Tambah
                            </button>
                        </td>
                    `;
                    productListElement.appendChild(row);
                });
            } else {
                productTableView.style.display = 'none';
                productGridView.style.display = 'grid';
                filteredProducts.forEach(product => {
                    const card = document.createElement('div');
                    card.classList.add('product-card');
                    card.innerHTML = `
                        <div class="product-card-img-container">
                            ${product.image ? `<img src="${product.image}" class="product-card-img" alt="${product.name}">` : '<i class="bi bi-image-fill text-muted fs-1"></i>'}
                        </div>
                        <div class="product-card-body">
                            <h6>${product.name}</h6>
                            <p class="text-primary fw-bold mb-1">${formatCurrency(product.sellPrice)}</p>
                            <p class="small text-muted mb-2">Stok: ${product.stock}</p>
                            <button class="btn btn-primary add-to-cart" data-id="${product.id}">
                                <i class="bi bi-cart-plus"></i> Tambah
                            </button>
                        </div>
                    `;
                    productGridView.appendChild(card);
                });
            }

            productTableBody.innerHTML = '';
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        ${product.image ? `<img src="${product.image}" class="product-img" alt="${product.name}">` : '<i class="bi bi-image text-muted"></i>'}
                    </td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.buyPrice)}</td>
                    <td>${formatCurrency(product.sellPrice)}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1 edit-product" data-id="${product.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                productTableBody.appendChild(row);
            });

            document.querySelectorAll('.add-to-cart').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    addToCart(productId);
                });
            });

            document.querySelectorAll('.edit-product').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    editProduct(productId);
                });
            });

            document.querySelectorAll('.delete-product').forEach(btn => {
                btn.addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    deleteProduct(productId);
                });
            });
        }

        // Fungsi Khusus Report
        function populateProductFilterDropdown() {
            reportProductFilter.innerHTML = '<option value="all">Semua Produk</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                reportProductFilter.appendChild(option);
            });
        }

        function generateItemProfitReport(filteredTransactions, selectedProductId = 'all') {
            reportItemProfitTable.innerHTML = '';
            const itemSales = {};

            filteredTransactions.forEach(transaction => {
                transaction.items.forEach(item => {
                    if (selectedProductId === 'all' || item.productId === selectedProductId) {
                        if (!itemSales[item.productId]) {
                            itemSales[item.productId] = {
                                name: item.namaBarang,
                                qty: 0,
                                totalSales: 0,
                                totalHPP: 0,
                                totalProfit: 0
                            };
                        }
                        itemSales[item.productId].qty += item.kuantitas;
                        itemSales[item.productId].totalSales += item.total;
                        itemSales[item.productId].totalHPP += (item.buyPrice * item.kuantitas);
                        itemSales[item.productId].totalProfit += (item.hargaBarang - item.buyPrice) * item.kuantitas;
                    }
                });
            });

              const sortedItems = Object.values(itemSales).sort((a, b) => b.totalSales - a.totalSales);

            if (sortedItems.length === 0) {
                reportItemProfitTable.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data penjualan per item dalam periode ini atau untuk produk yang dipilih.</td></tr>';
            } else {
                sortedItems.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.name}</td>
                        <td>${item.qty}</td>
                        <td>${formatCurrency(item.totalSales)}</td>
                        <td>${formatCurrency(item.totalHPP)}</td>
                        <td>${formatCurrency(item.totalProfit)}</td>
                    `;
                    reportItemProfitTable.appendChild(row);
                });
            }
        }

        function generateStockReport(selectedProductId = 'all') {
            reportStockTable.innerHTML = '';

            let filteredProductsForStock = products;
            if (selectedProductId !== 'all') {
                filteredProductsForStock = products.filter(p => p.id === selectedProductId);
            }

            if (filteredProductsForStock.length === 0) {
                reportStockTable.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada produk dalam stok atau untuk produk yang dipilih.</td></tr>';
                return;
            }

            filteredProductsForStock.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>${product.stock}</td>
                    <td>${formatCurrency(product.buyPrice)}</td>
                    <td>${formatCurrency(product.sellPrice)}</td>
                `;
                reportStockTable.appendChild(row);
            });
        }

        // Fungsi Transaksi & Pembayaran
        function addToCart(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) {
                alert('Produk tidak ditemukan!');
                return;
            }

            const existingItem = currentTransaction.items.find(i => i.productId === productId);

            if (existingItem) {
                if (existingItem.kuantitas < product.stock) {
                    existingItem.kuantitas++;
                    existingItem.total = existingItem.hargaBarang * existingItem.kuantitas;
                } else {
                    alert('Stok tidak mencukupi!');
                    return;
                }
            } else {
                if (product.stock > 0) {
                    currentTransaction.items.push({
                        productId: product.id,
                        namaBarang: product.name,
                        hargaBarang: product.sellPrice,
                        kuantitas: 1,
                        total: product.sellPrice,
                        buyPrice: product.buyPrice
                    });
                } else {
                    alert('Stok habis!');
                    return;
                }
            }
            updateTransactionDisplay();
        }

        function updateTransactionDisplay() {
            transactionItemsElement.innerHTML = '';

            if (currentTransaction.items.length === 0) {
                transactionItemsElement.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada item</td></tr>';
                transactionTotalElement.textContent = formatCurrency(0);
                return;
            }

            let total = 0;
            let profit = 0;

            currentTransaction.items.forEach((item, index) => {
                const itemPrice = parseFloat(item.hargaBarang) || 0;
                item.total = itemPrice * item.kuantitas;

                total += item.total;
                profit += (itemPrice - item.buyPrice) * item.kuantitas;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.namaBarang}</td>
                    <td>
                        <input type="text" class="form-control form-control-sm price-input" value="${formatNumberForInput(itemPrice)}" data-index="${index}" style="width: 100px;">
                    </td>
                    <td>
                        <div class="input-group input-group-sm" style="width: 120px;">
                            <button class="btn btn-outline-secondary decrease-qty" data-index="${index}" type="button">-</button>
                            <input type="number" class="form-control text-center qty-input" value="${item.kuantitas}" min="1" data-index="${index}">
                            <button class="btn btn-outline-secondary increase-qty" data-index="${index}" type="button">+</button>
                        </div>
                    </td>
                    <td>${formatCurrency(item.total)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger remove-item" data-index="${index}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                transactionItemsElement.appendChild(row);
            });

            currentTransaction.total = total;
            currentTransaction.profit = profit;
            transactionTotalElement.textContent = formatCurrency(total);

            document.querySelectorAll('.price-input').forEach(input => {
                input.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const newPrice = parseFloat(this.value.replace(/[^0-9.]/g,""));
                    if (!isNaN(newPrice) && newPrice >= 0) {
                        currentTransaction.items[index].hargaBarang = newPrice;
                    } else {
                        alert('Harga tidak valid!');
                        this.value = formatNumberForInput(currentTransaction.items[index].hargaBarang);
                    }
                    updateTransactionDisplay();
                });
            });

            document.querySelectorAll('.decrease-qty').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    updateItemQuantity(index, -1);
                });
            });

            document.querySelectorAll('.increase-qty').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    updateItemQuantity(index, 1);
                });
            });

            document.querySelectorAll('.qty-input').forEach(input => {
                input.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const newQty = parseInt(this.value);
                    updateItemQuantity(index, 0, newQty);
                });
            });

            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    removeItemFromCart(index);
                });
            });
        }

        function updateItemQuantity(index, change, newQty = null) {
            const item = currentTransaction.items[index];
            if (!item) return;

            const product = products.find(p => p.id === item.productId);
            const maxStock = product ? product.stock : Infinity;

            let newQuantity = newQty !== null ? newQty : item.kuantitas + change;

            if (newQuantity < 1) newQuantity = 1;
            if (newQuantity > maxStock) {
                alert('Stok tidak mencukupi!');
                newQuantity = maxStock;
            }

            item.kuantitas = newQuantity;
            item.total = item.hargaBarang * newQuantity;

            updateTransactionDisplay();
        }

        function viewReceipt(transactionId) {
            const transaction = transactions.find(t => t.id === transactionId);
            if (!transaction) {
                console.error("Transaksi tidak ditemukan untuk dilihat struknya:", transactionId);
                return;
            }
            receiptContent.innerHTML = generateReceipt(transaction);
            receiptModal.show();
        }

        function generateReceipt(transaction) {
            let itemsHTML = '';
            transaction.items.forEach(item => {
                itemsHTML += `
                    <div class="receipt-item">
                        <span style="width: 60%">${item.namaBarang}</span>
                        <span style="width: 15%; text-align: right">${item.kuantitas}</span>
                        <span style="width: 25%; text-align: right">${formatCurrency(item.hargaBarang)}</span>
                    </div>
                    <div class="receipt-item">
                        <span style="width: 60%;"></span>
                        <span style="width: 15%; text-align: right"></span>
                        <span style="width: 25%; text-align: right">${formatCurrency(item.total)}</span>
                    </div>
                `;
            });

            return `
                <div class="receipt" id="printable-receipt">
                    <div class="receipt-header">
                        <h5>${settings.storeName}</h5>
                        <p>${settings.storeAddress}</p>
                        <p>Telp: ${settings.storePhone}</p>
                        <hr>
                        <p>No: #${transaction.id}</p>
                        <p>${transaction.date ? new Date(transaction.date).toLocaleString('id-ID', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        ${transaction.customerName ? `<p>Pelanggan: ${transaction.customerName}</p>` : ''}
                        <p>Metode: ${getPaymentMethodName(transaction.paymentMethod)}</p>
                        <hr>
                        <div class="receipt-item">
                            <span style="width: 60%; font-weight: bold;">Produk</span>
                            <span style="width: 15%; text-align: right; font-weight: bold;">Qty</span>
                            <span style="width: 25%; text-align: right; font-weight: bold;">Harga</span>
                        </div>
                        <hr>
                    </div>
                    ${itemsHTML}
                    <hr>
                    <div class="receipt-total receipt-item">
                        <span>TOTAL</span>
                        <span>${formatCurrency(transaction.total)}</span>
                    </div>
                    <div class="receipt-item">
                        <span>DIBAYAR</span>
                        <span>${formatCurrency(transaction.amountPaid)}</span>
                    </div>
                    <div class="receipt-item">
                        <span>KEMBALI</span>
                        <span>${formatCurrency(transaction.change)}</span>
                    </div>
                    <div class="receipt-footer">
                        <hr>
                        <p>${settings.receiptFooter}</p>
                    </div>
                </div>
            `;
        }

        // Fungsi Edit Histori
        function editHistory(transactionId) {
            editingTransactionId = transactionId;
            const row = Array.from(historyList.rows).find(row => row.querySelector('.view-receipt')?.getAttribute('data-id') === transactionId);
            if (row) {
                row.classList.add('edit-row');
                const itemsCell = row.querySelector('.transaction-items');
                const totalCell = row.querySelector('.transaction-total');
                
                const originalTransaction = transactions.find(t => t.id === transactionId);
                const originalItemsCount = originalTransaction ? originalTransaction.items.length : 0;
                const originalTotal = originalTransaction ? originalTransaction.total : 0;

                itemsCell.innerHTML = `<input type="number" class="form-control form-control-sm" value="${originalItemsCount}">`;
                totalCell.innerHTML = `<input type="text" class="form-control form-control-sm" value="${formatNumberForInput(originalTotal)}">`;

                const actionsCell = row.querySelector('td:last-child');
                actionsCell.innerHTML = `
                    <button class="btn btn-sm btn-success save-history-btn" data-id="${transactionId}"><i class="bi bi-save"></i></button>
                    <button class="btn btn-sm btn-secondary cancel-edit-history-btn" data-id="${transactionId}"><i class="bi bi-x"></i></button>
                `;

                const saveBtn = row.querySelector('.save-history-btn');
                const cancelBtn = row.querySelector('.cancel-edit-history-btn');

                saveBtn.addEventListener('click', () => saveEditedHistory(transactionId, row));
                cancelBtn.addEventListener('click', () => cancelEditHistory(transactionId, row));
            } else {
                console.error("Row not found for editing transaction ID:", transactionId);
            }
        }

        async function saveEditedHistory(transactionId, row) {
            const itemsInput = row.querySelector('.transaction-items input');
            const totalInput = row.querySelector('.transaction-total input');

            const newItemsCount = parseInt(itemsInput.value);
            const newTotal = parseFloat(totalInput.value.replace(/[^0-9.]/g,""));

            const transactionIndex = transactions.findIndex(t => t.id === transactionId);
            if (transactionIndex !== -1) {
                transactions[transactionIndex].total = newTotal;
                transactions[transactionIndex].updatedAt = new Date().toISOString();

                localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));

                if (isOnline && settings.syncEnabled) {
                    try {
                        await db.collection('transactions').doc(transactionId).update({
                            total: newTotal,
                            updatedAt: transactions[transactionIndex].updatedAt
                        });
                        alert('Perubahan riwayat transaksi berhasil disimpan (data lokal & online diperbarui).');
                        console.log("Transaksi histori diperbarui di Firebase:", transactionId);
                    } catch (firebaseErr) {
                        console.error("Firebase Error: Gagal memperbarui transaksi histori di Firestore:", firebaseErr);
                        alert('Gagal menyimpan perubahan riwayat transaksi ke database. Data disimpan secara lokal. Error: ' + firebaseErr.message);
                    }
                } else {
                    alert('Perubahan riwayat transaksi berhasil disimpan (data lokal diperbarui). Tidak ada koneksi internet atau sinkronisasi dinonaktifkan.');
                }
            } else {
                console.error("Transaksi tidak ditemukan di array untuk ID:", transactionId);
            }

            row.querySelector('.transaction-items').textContent = `${newItemsCount} items`;
            row.querySelector('.transaction-total').textContent = formatCurrency(newTotal);

            const actionsCell = row.querySelector('td:last-child');
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-info view-receipt" data-id="${transactionId}">
                    <i class="bi bi-receipt"></i> Lihat
                </button>
                <button class="btn btn-sm btn-warning ms-1 edit-history-btn" data-id="${transactionId}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            `;
            const viewReceiptBtn = actionsCell.querySelector('.view-receipt');
            const editBtn = actionsCell.querySelector('.edit-history-btn');

            viewReceiptBtn.addEventListener('click', function() {
                const transactionId = this.getAttribute('data-id');
                viewReceipt(transactionId);
            });
            editBtn.addEventListener('click', () => editHistory(transactionId));

            row.classList.remove('edit-row');
            editingTransactionId = null;
            loadDashboard();
        }

        function cancelEditHistory(transactionId, row) {
            const transaction = transactions.find(t => t.id === transactionId);
            if (transaction) {
                row.querySelector('.transaction-items').textContent = `${transaction.items.length} items`;
                row.querySelector('.transaction-total').textContent = formatCurrency(transaction.total);
            } else {
                console.warn("Transaksi tidak ditemukan untuk membatalkan edit:", transactionId);
                row.querySelector('.transaction-items').textContent = `N/A items`;
                row.querySelector('.transaction-total').textContent = `N/A`;
            }

            const actionsCell = row.querySelector('td:last-child');
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-info view-receipt" data-id="${transactionId}">
                    <i class="bi bi-receipt"></i> Lihat
                </button>
                <button class="btn btn-sm btn-warning ms-1 edit-history-btn" data-id="${transactionId}">
                    <i class="bi bi-pencil"></i> Edit
                </button>
            `;
            const viewReceiptBtn = actionsCell.querySelector('.view-receipt');
            const editBtn = actionsCell.querySelector('.edit-history-btn');

            viewReceiptBtn.addEventListener('click', function() {
                const transactionId = this.getAttribute('data-id');
                viewReceipt(transactionId);
            });
            editBtn.addEventListener('click', () => editHistory(transactionId));

            row.classList.remove('edit-row');
            editingTransactionId = null;
        }

        // Fungsi Upload Gambar
        async function uploadImageToCloudinary(file) {
            if (CLOUDINARY_CLOUD_NAME === 'ganti_dengan_cloud_name_anda' || CLOUDINARY_UPLOAD_PRESET === 'ganti_dengan_upload_preset_anda') {
                console.warn('Cloudinary not configured. Image upload will not work.');
                throw new Error('Cloudinary configuration is missing. Please update CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in the code.');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Upload gagal: ${errorData.error.message || response.statusText}`);
                }
                const data = await response.json();
                console.log("Image uploaded to Cloudinary:", data.secure_url);
                return data.secure_url;
            } catch (error) {
                console.error('Kesalahan unggah Cloudinary:', error);
                throw error;
            }
        }

        // Fungsi Edit Produk
        function editProduct(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) {
                console.error("Produk tidak ditemukan untuk diedit:", productId);
                return;
            }
            editingProductId = productId;
            productIdHidden.value = product.id;
            productNameInput.value = product.name;
            productBuyPriceInput.value = product.buyPrice;
            productSellPriceInput.value = product.sellPrice;
            productStockInput.value = product.stock;
            productImageUpload.value = '';

            if (product.image) {
                productImagePreview.src = product.image;
                productImagePreviewContainer.style.display = 'block';
            } else {
                productImagePreview.src = '';
                productImagePreviewContainer.style.display = 'none';
            }
            saveProductBtn.textContent = 'Update Produk';
            saveProductBtn.classList.remove('btn-primary');
            saveProductBtn.classList.add('btn-warning');
            cancelEditBtn.style.display = 'block';

            const stockTabElement = document.getElementById('nav-stock-tab');
            if (stockTabElement) {
                const bsTab = new bootstrap.Tab(stockTabElement);
                bsTab.show();
            }
            productNameInput.focus();
        }

        function cancelEditBtnClickHandler() { // Buat fungsi terpisah untuk event listener
            editingProductId = null;
            productForm.reset();
            saveProductBtn.textContent = 'Simpan Produk';
            saveProductBtn.classList.remove('btn-warning');
            saveProductBtn.classList.add('btn-primary');
            cancelEditBtn.style.display = 'none';
            productImagePreview.src = '';
            productImagePreviewContainer.style.display = 'none';
        }

        async function deleteProduct(productId) {
            if (confirm('Hapus produk ini? Tindakan ini tidak dapat dibatalkan.')) {
                const success = await deleteProductFromFirestore(productId);
                if (success) {
                    alert('Produk berhasil dihapus!');
                } else {
                    alert('Gagal menghapus produk.');
                }
            }
        }

        // --- 5. Fungsi Inisialisasi Utama (`init()`) ---
        async function init() {
            console.log("App init started.");
            // Set default dates for report
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            reportStartDate.valueAsDate = firstDay;
            reportEndDate.valueAsDate = lastDay;

            loadSettings();

            const lastSync = localStorage.getItem(LOCAL_LAST_SYNC_KEY);
            const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

            if (isOnline && settings.syncEnabled) {
                if (!lastSync || lastSync < oneHourAgo) {
                    await syncData();
                } else {
                    await fetchProducts();
                    await fetchTransactions();
                    await fetchPendingTransactions();
                }
            } else {
                await fetchProducts();
                await fetchTransactions();
                await fetchPendingTransactions();
            }

            resetCurrentTransaction();
            loadHistory();
            loadDashboard(); // Panggil ini setelah semua data dimuat

            // --- Bagian Event Listener untuk Tombol/Form ---
            const sidebarToggle = document.getElementById('sidebarToggle');
            const wrapper = document.getElementById('wrapper');
            const sidebarNav = document.getElementById('sidebar-nav'); // Elemen nav sidebar

            if (sidebarToggle && wrapper && sidebarNav) {
                console.log("Initializing sidebar toggle listener.");
                sidebarToggle.addEventListener('click', (event) => {
                    event.stopPropagation();
                    wrapper.classList.toggle('toggled');
                    console.log("Sidebar toggled. Current state:", wrapper.classList.contains('toggled') ? 'open' : 'closed');
                });

                wrapper.addEventListener('click', (event) => {
                    const sidebar = document.querySelector('.sidebar');
                    if (window.innerWidth <= 768 && wrapper.classList.contains('toggled') && sidebar && !sidebar.contains(event.target) && event.target !== sidebarToggle) {
                        wrapper.classList.remove('toggled');
                        console.log("Clicked outside, sidebar closed.");
                    }
                });

                sidebarNav.querySelectorAll('.nav-link').forEach(link => {
                    link.addEventListener('click', () => {
                        if (window.innerWidth <= 768) {
                            setTimeout(() => {
                                wrapper.classList.remove('toggled');
                                console.log("Nav link clicked, sidebar closed on mobile.");
                            }, 150);
                        }
                    });
                });
            } else {
                console.error("ERROR: One or more sidebar elements not found for toggle setup!", { sidebarToggle, wrapper, sidebarNav });
            }

            // Event listener lainnya
            savePendingBtn.addEventListener('click', async () => {
                if (currentTransaction.items.length === 0) {
                    alert('Tidak ada item dalam transaksi!');
                    return;
                }
                const pendingCustomerName = prompt("Masukkan nama pelanggan untuk transaksi pending (opsional):");
                if (pendingCustomerName !== null) {
                    currentTransaction.customerName = pendingCustomerName.trim();
                } else {
                    currentTransaction.customerName = '';
                }
                currentTransaction.date = new Date().toISOString();
                const success = await savePendingTransactionToFirestore(currentTransaction);
                if (success) {
                    resetCurrentTransaction();
                    alert('Transaksi berhasil disimpan sebagai pending!');
                } else {
                    alert('Gagal menyimpan transaksi sebagai pending.');
                }
            });

            processPaymentBtn.addEventListener('click', () => {
                if (currentTransaction.items.length === 0) {
                    alert('Tidak ada item dalam transaksi!');
                    return;
                }
                paymentModalTotal.textContent = formatCurrency(currentTransaction.total);
                amountPaidElement.value = formatNumberForInput(currentTransaction.total);
                customerNameElement.value = currentTransaction.customerName;
                calculateChange();
                paymentModal.show();
            });

            completePaymentBtn.addEventListener('click', async () => {
                if (currentTransaction.items.length === 0) {
                    alert('Tidak ada item dalam transaksi!');
                    return;
                }
                const amountPaid = parseFloat(amountPaidElement.value.replace(/[^0-9.]/g,"")) || 0;
                if (amountPaid < currentTransaction.total) {
                    alert('Jumlah pembayaran kurang!');
                    return;
                }

                let allStockUpdatesSuccessful = true;
                const stockUpdatePromises = currentTransaction.items.map(async (item) => {
                    const product = products.find(p => p.id === item.productId);
                    if (product) {
                        const newStock = product.stock - item.kuantitas;
                        const success = await saveProductToFirestore({ stock: newStock }, product.id);
                        if (!success) {
                            allStockUpdatesSuccessful = false;
                        }
                        return success;
                    }
                    return true;
                });
                await Promise.all(stockUpdatePromises);

                if (!allStockUpdatesSuccessful) {
                    alert("Gagal memperbarui stok salah satu produk. Transaksi tidak dapat diselesaikan.");
                    return;
                }

                currentTransaction.date = new Date().toISOString();
                const transactionSuccess = await saveTransactionToFirestore(currentTransaction);
                if (!transactionSuccess) {
                    // saveTransactionToFirestore sudah memberikan alert lebih spesifik
                    return;
                }

                paymentModal.hide();
                receiptContent.innerHTML = generateReceipt(currentTransaction);
                receiptModal.show();

                resetCurrentTransaction();

                await fetchProducts();
                await fetchTransactions();
                await fetchPendingTransactions();
                loadDashboard();
                populateProductFilterDropdown();
            });

            productForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = productNameInput.value.trim();
                const buyPrice = parseFloat(productBuyPriceInput.value);
                const sellPrice = parseFloat(productSellPriceInput.value.replace(/[^0-9.]/g,""));
                const stock = parseInt(productStockInput.value);
                const imageFile = productImageUpload.files[0];

                let imageUrl = null;

                if (!name || isNaN(buyPrice) || isNaN(sellPrice) || isNaN(stock)) {
                    alert('Harap isi semua field dengan benar!');
                    return;
                }
                if (buyPrice <= 0 || sellPrice <= 0 || stock < 0) {
                    alert('Harga dan stok harus valid!');
                    return;
                }
                if (sellPrice < buyPrice) {
                    alert('Harga jual tidak boleh lebih kecil dari harga beli!');
                    return;
                }

                if (imageFile) {
                    if (CLOUDINARY_CLOUD_NAME === 'ganti_dengan_cloud_name_anda' || CLOUDINARY_UPLOAD_PRESET === 'ganti_dengan_upload_preset_anda') {
                        alert('Cloudinary belum dikonfigurasi. Gambar tidak dapat diunggah. Silakan perbarui variabel CLOUDINARY_CLOUD_NAME dan CLOUDINARY_UPLOAD_PRESET di kode.');
                    } else {
                        try {
                            saveProductBtn.textContent = 'Mengunggah Gambar...';
                            saveProductBtn.disabled = true;
                            imageUrl = await uploadImageToCloudinary(imageFile);
                            if (!imageUrl) {
                                alert('Gagal mengunggah gambar ke Cloudinary.');
                                saveProductBtn.textContent = 'Simpan Produk';
                                saveProductBtn.disabled = false;
                                return;
                            }
                        } catch (error) {
                            console.error('Error uploading image:', error);
                            alert('Terjadi kesalahan saat mengunggah gambar. Coba lagi: ' + error.message);
                            saveProductBtn.textContent = 'Simpan Produk';
                            saveProductBtn.disabled = false;
                            return;
                        }
                    }
                } else if (editingProductId) {
                    const existingProduct = products.find(p => p.id === editingProductId);
                    if (existingProduct) {
                        imageUrl = existingProduct.image;
                    }
                }
                const productData = {
                    name,
                    buyPrice,
                    sellPrice,
                    stock,
                    image: imageUrl
                };

                const success = await saveProductToFirestore(productData, editingProductId);
                if (success) {
                    alert(editingProductId ? 'Produk berhasil diperbarui!' : 'Produk berhasil ditambahkan!');
                    editingProductId = null;
                    productForm.reset();
                    saveProductBtn.textContent = 'Simpan Produk';
                    saveProductBtn.classList.remove('btn-warning');
                    saveProductBtn.classList.add('btn-primary');
                    cancelEditBtn.style.display = 'none';
                    productImagePreview.src = '';
                    productImagePreviewContainer.style.display = 'none';
                } else {
                    saveProductBtn.textContent = 'Simpan Produk';
                    saveProductBtn.disabled = false;
                }
            });

            productImageUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        productImagePreview.src = e.target.result;
                        productImagePreviewContainer.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                } else {
                    productImagePreview.src = '';
                    productImagePreviewContainer.style.display = 'none';
                }
            });

            cancelEditBtn.addEventListener('click', cancelEditBtnClickHandler); // Gunakan fungsi handler yang sudah didefinisikan

            generateReportBtn.addEventListener('click', () => {
                const startDate = reportStartDate.value;
                const endDate = reportEndDate.value;
                const selectedProductId = reportProductFilter.value;

                if (!startDate || !endDate) {
                    alert('Harap pilih tanggal mulai dan tanggal akhir!');
                    return;
                }
                if (new Date(startDate) > new Date(endDate)) {
                    alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir!');
                    return;
                }

                let filteredTransactions = transactions.filter(t => {
                    if (!t || !t.date) return false;
                    const transactionDate = new Date(t.date).toISOString().split('T')[0];
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
                if (selectedProductId !== 'all') {
                    filteredTransactions = filteredTransactions.map(transaction => {
                        const filteredItems = transaction.items.filter(item => item.productId === selectedProductId);
                        if (filteredItems.length === 0) return null;
                        const newTotal = filteredItems.reduce((sum, item) => sum + item.total, 0);
                        const newProfit = filteredItems.reduce((sum, item) => sum + ((item.hargaBarang - item.buyPrice) * item.kuantitas), 0);
                        return { ...transaction, items: filteredItems, total: newTotal, profit: newProfit };
                    }).filter(t => t !== null);
                }
                const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
                const totalPurchases = filteredTransactions.reduce((sum, t) => {
                    return sum + t.items.reduce((itemSum, i) => itemSum + (i.buyPrice * i.kuantitas), 0);
                }, 0);
                const grossProfit = totalSales - totalPurchases;

                reportTotalSales.textContent = formatCurrency(totalSales);
                reportTotalPurchases.textContent = formatCurrency(totalPurchases);
                reportGrossProfit.textContent = formatCurrency(grossProfit);

                reportTransactions.innerHTML = '';
                if (filteredTransactions.length === 0) {
                    reportTransactions.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada transaksi</td></tr>';
                } else {
                    filteredTransactions.forEach(transaction => {
                        const transactionProfit = transaction.total - transaction.items.reduce((sum, i) => sum + (i.buyPrice * i.kuantitas), 0);
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${transaction.date ? new Date(transaction.date).toLocaleDateString('id-ID') : 'N/A'}</td>
                            <td>#${transaction.id}</td>
                            <td>${formatCurrency(transaction.total)}</td>
                            <td>${formatCurrency(transactionProfit)}</td>
                        `;
                        reportTransactions.appendChild(row);
                    });
                }
                generateItemProfitReport(filteredTransactions, selectedProductId);
                generateStockReport(selectedProductId);
            });

            downloadReportPdfBtn.addEventListener('click', function () {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const activeTab = document.querySelector('#reportTabs .nav-link.active')?.id;

                doc.setFontSize(16);
                doc.text("Laporan Rugi Laba", 14, 20);
                doc.setFontSize(10);

                const startDate = document.getElementById('report-start-date').value || '-';
                const endDate = document.getElementById('report-end-date').value || '-';
                doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 28);

                if (activeTab === 'summary-tab') {
                    const totalSales = document.getElementById('report-total-sales').innerText;
                    const totalPurchases = document.getElementById('report-total-purchases').innerText;
                    const grossProfit = document.getElementById('report-gross-profit').innerText;

                    doc.text(`Total Penjualan: ${totalSales}`, 14, 38);
                    doc.text(`Total Pembelian (HPP): ${totalPurchases}`, 14, 44);
                    doc.text(`Laba Kotor: ${grossProfit}`, 14, 50);

                    doc.autoTable({
                        html: '#report-transactions',
                        startY: 60,
                        theme: 'grid',
                        headStyles: { fillColor: [0, 123, 255] },
                    });
                } else if (activeTab === 'item-profit-tab') {
                    doc.autoTable({
                        html: '#report-item-profit-table',
                        startY: 38,
                        theme: 'grid',
                        headStyles: { fillColor: [40, 167, 69] },
                    });
                } else if (activeTab === 'stock-report-tab') {
                    doc.autoTable({
                        html: '#report-stock-table',
                        startY: 38,
                        theme: 'grid',
                        headStyles: { fillColor: [255, 193, 7] },
                    });
                } else {
                    doc.text('Silakan pilih tab laporan yang ingin dicetak.', 14, 38);
                }

                doc.save("laporan-rugi-laba.pdf");
            });

            backupBtn.addEventListener('click', () => {
                const backupData = {};
                if (backupProductsCheckbox.checked) {
                    backupData.products = products;
                }
                if (backupTransactionsCheckbox.checked) {
                    backupData.transactions = transactions;
                }
                if (backupPendingCheckbox.checked) {
                    backupData.pendingTransactions = pendingTransactions;
                }
                backupData.settings = settings;

                if (Object.keys(backupData).length === 0) {
                    alert('Tidak ada data yang dipilih untuk di-backup!');
                    return;
                }
                const dataStr = JSON.stringify(backupData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `pos_backup_${new Date().toISOString().slice(0,10)}.json`;

                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                document.body.appendChild(linkElement);
                linkElement.click();
                document.body.removeChild(linkElement);
                alert('Data berhasil di-backup!');
            });

            restoreBtn.addEventListener('click', () => {
                if (!restoreFile.files.length) {
                    alert('Harap pilih file backup terlebih dahulu!');
                    return;
                }
                if (confirm('Restore data akan mengganti data yang ada di database lokal dan Firebase. Pastikan Anda sudah membackup data terbaru. Lanjutkan?')) {
                    const file = restoreFile.files[0];
                    const reader = new FileReader();

                    reader.onload = async (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            let restorePerformed = false;

                            if (data.products && confirm('Restore data produk? Ini akan menghapus dan menimpa SEMUA produk di database. Pastikan Anda memahami risikonya.')) {
                                if (isOnline && settings.syncEnabled) {
                                    try {
                                        const existingProductRefs = await db.collection('products').listDocuments();
                                        const deletePromises = existingProductRefs.map(docRef => docRef.delete());
                                        await Promise.all(deletePromises);
                                        const addPromises = data.products.map(product => {
                                            return db.collection('products').doc(product.id).set(product);
                                        });
                                        await Promise.all(addPromises);
                                        console.log("Produk berhasil di-restore ke Firebase.");
                                    } catch (firebaseErr) {
                                        console.error("Firebase Error: Gagal restore produk ke Firestore:", firebaseErr);
                                        alert("Gagal restore produk ke Firebase. Data akan tetap di-restore secara lokal. Error: " + firebaseErr.message);
                                    }
                                }
                                localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(data.products));
                                products = data.products;
                                restorePerformed = true;
                            }

                            if (data.transactions && confirm('Restore data transaksi? Ini akan menghapus dan menimpa SEMUA transaksi di database. Pastikan Anda memahami risikonya.')) {
                                if (isOnline && settings.syncEnabled) {
                                    try {
                                        const existingTransactionRefs = await db.collection('transactions').listDocuments();
                                        const deletePromises = existingTransactionRefs.map(docRef => docRef.delete());
                                        await Promise.all(deletePromises);
                                        const addPromises = data.transactions.map(transaction => {
                                            return db.collection('transactions').doc(transaction.id).set(transaction);
                                        });
                                        await Promise.all(addPromises);
                                        console.log("Transaksi berhasil di-restore ke Firebase.");
                                    } catch (firebaseErr) {
                                        console.error("Firebase Error: Gagal restore transaksi ke Firestore:", firebaseErr);
                                        alert("Gagal restore transaksi ke Firebase. Data akan tetap di-restore secara lokal. Error: " + firebaseErr.message);
                                    }
                                }
                                localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(data.transactions));
                                transactions = data.transactions;
                                restorePerformed = true;
                            }

                            if (data.pendingTransactions && confirm('Restore transaksi pending? Ini akan menghapus dan menimpa SEMUA transaksi pending di database. Pastikan Anda memahami risikonya.')) {
                                if (isOnline && settings.syncEnabled) {
                                    try {
                                        const existingPendingRefs = await db.collection('pendingTransactions').listDocuments();
                                        const deletePromises = existingPendingRefs.map(docRef => docRef.delete());
                                        await Promise.all(deletePromises);
                                        const addPromises = data.pendingTransactions.map(pending => {
                                            return db.collection('pendingTransactions').doc(pending.id).set(pending);
                                        });
                                        await Promise.all(addPromises);
                                        console.log("Transaksi pending berhasil di-restore ke Firebase.");
                                    } catch (firebaseErr) {
                                        console.error("Firebase Error: Gagal restore transaksi pending ke Firestore:", firebaseErr);
                                        alert("Gagal restore transaksi pending ke Firebase. Data akan tetap di-restore secara lokal. Error: " + firebaseErr.message);
                                    }
                                }
                                localStorage.setItem(LOCAL_PENDING_KEY, JSON.stringify(data.pendingTransactions));
                                pendingTransactions = data.pendingTransactions;
                                restorePerformed = true;
                            }

                            if (data.settings && confirm('Restore pengaturan aplikasi? Ini akan menimpa pengaturan lokal yang ada.')) {
                                settings = data.settings;
                                localStorage.setItem('pos_settings', JSON.stringify(settings));
                                loadSettings();
                                restorePerformed = true;
                            }

                            if (restorePerformed) {
                                await fetchProducts();
                                await fetchTransactions();
                                await fetchPendingTransactions();
                                alert('Data berhasil di-restore dan diperbarui!');
                            } else {
                                alert('Tidak ada data yang di-restore.');
                            }
                        } catch (error) {
                            alert('Gagal memproses file backup: ' + error.message);
                            console.error("Restore error:", error);
                        }
                    };
                    reader.readAsText(file);
                }
            });

            printReceiptBtn.addEventListener('click', () => {
                const modalFooter = document.querySelector('#receiptModal .modal-footer');
                if (modalFooter) modalFooter.classList.add('d-none');

                const receiptElement = document.getElementById('printable-receipt');
                if (settings.printerPaperSize === '58mm') {
                    receiptElement.style.maxWidth = '220px';
                } else if (settings.printerPaperSize === '80mm') {
                    receiptElement.style.maxWidth = '300px';
                } else {
                    receiptElement.style.maxWidth = '';
                }

                window.print();

                if (modalFooter) modalFooter.classList.remove('d-none');
                receiptElement.style.maxWidth = '300px';
            });

            shareReceiptImageBtn.addEventListener('click', () => {
                const receiptElement = document.getElementById('printable-receipt');
                if (!receiptElement) {
                    alert('Struk tidak ditemukan.');
                    return;
                }

                const modalFooter = document.querySelector('#receiptModal .modal-footer');
                if (modalFooter) modalFooter.classList.add('d-none');

                html2canvas(receiptElement, { scale: 2 }).then(canvas => {
                    if (modalFooter) modalFooter.classList.remove('d-none');

                    canvas.toBlob(async (blob) => {
                        if (navigator.share) {
                            try {
                                const file = new File([blob], `struk_pembayaran_${currentTransaction.id}.png`, { type: 'image/png' });
                                await navigator.share({
                                    files: [file],
                                    title: 'Struk Pembayaran POS',
                                    text: 'Berikut struk pembayaran dari toko kami.'
                                });
                                console.log('Struk berhasil dibagikan');
                            } catch (error) {
                                console.error('Kesalahan berbagi:', error);
                                alert('Gagal berbagi struk. Fitur ini mungkin tidak didukung di perangkat atau browser Anda. Silakan download secara manual.');
                                const imageDataUrl = canvas.toDataURL('image/png');
                                const downloadLink = document.createElement('a');
                                downloadLink.href = imageDataUrl;
                                downloadLink.download = `struk_pembayaran_${currentTransaction.id}.png`;
                                document.body.appendChild(downloadLink);
                                downloadLink.click();
                                document.body.removeChild(downloadLink);
                            }
                        } else {
                            alert('Fitur berbagi tidak didukung di browser ini. Silakan download gambar struk dan bagikan secara manual.');
                            const imageDataUrl = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.href = imageDataUrl;
                            downloadLink.download = `struk_pembayaran_${currentTransaction.id}.png`;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            document.body.removeChild(downloadLink);
                        }
                    }, 'image/png');
                }).catch(error => {
                    console.error('Kesalahan menghasilkan gambar struk:', error);
                    alert('Gagal membuat gambar struk. Silakan coba lagi.');
                    if (modalFooter) modalFooter.classList.remove('d-none');
                });
            });

            storeSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                settings.storeName = storeNameInput.value.trim();
                settings.storeAddress = storeAddressInput.value.trim();
                settings.storePhone = storePhoneInput.value.trim();
                settings.receiptFooter = receiptFooterInput.value.trim();
                localStorage.setItem('pos_settings', JSON.stringify(settings));
                alert('Pengaturan toko berhasil disimpan!');
                if (receiptModal._isShown) {
                    receiptContent.innerHTML = generateReceipt(currentTransaction);
                }
            });

            savePrinterSettingsBtn.addEventListener('click', () => {
                settings.printerPaperSize = printerPaperSizeSelect.value;
                settings.printPreview = printPreviewSelect.value;
                localStorage.setItem('pos_settings', JSON.stringify(settings));
                alert('Pengaturan printer berhasil disimpan!');
            });

            saveOtherSettingsBtn.addEventListener('click', async () => {
                settings.currencySymbol = currencySymbolInput.value.trim();
                localStorage.setItem('pos_settings', JSON.stringify(settings));
                alert('Pengaturan lainnya berhasil disimpan!');
                await fetchProducts();
                await fetchTransactions();
                await fetchPendingTransactions();
                loadDashboard();
                updateTransactionDisplay();
            });

            amountPaidElement.addEventListener('input', () => {
                const cleanValue = amountPaidElement.value.replace(/[^0-9.]/g,"");
                amountPaidElement.value = cleanValue;
                calculateChange();
            });

            paymentMethodElement.addEventListener('change', () => {
                currentTransaction.paymentMethod = paymentMethodElement.value;
            });
            customerNameElement.addEventListener('input', () => {
                currentTransaction.customerName = customerNameElement.value;
            });

            pendingCustomerNameInput.addEventListener('input', () => {
                // This input is primarily for initially *setting* the customer name before saving as pending.
            });

            productSearchElement.addEventListener('input', (e) => {
                loadProducts(e.target.value, currentProductView);
            });
            productListSearch.addEventListener('input', (e) => {
                loadProducts(e.target.value, currentProductView);
            });

            viewListBtn.addEventListener('click', () => {
                viewListBtn.classList.add('active');
                viewGridBtn.classList.remove('active');
                loadProducts(productSearchElement.value, 'list');
            });

            viewGridBtn.addEventListener('click', () => {
                viewGridBtn.classList.add('active');
                viewListBtn.classList.remove('active');
                loadProducts(productSearchElement.value, 'grid');
            });

            quickSalesBtn.addEventListener('click', () => {
                const salesTabElement = document.getElementById('nav-sales-tab');
                if (salesTabElement) {
                    const bsTab = new bootstrap.Tab(salesTabElement);
                    bsTab.show();
                }
            });

            quickAddProductBtn.addEventListener('click', () => {
                const stockTabElement = document.getElementById('nav-stock-tab');
                if (stockTabElement) {
                    const bsTab = new bootstrap.Tab(stockTabElement);
                    bsTab.show();
                }
            });

            console.log("App init finished.");
        } // END of init() function

        // --- 6. Pemanggilan init() saat DOM siap ---
        document.addEventListener('DOMContentLoaded', init);
if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')

                    .then(reg => {
                        console.log('Service Worker registered! Scope:', reg.scope);
                    })
                    .catch(err => {
                        console.log('Service Worker registration failed:', err);
                    });
            });
        }