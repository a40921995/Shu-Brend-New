import express, { Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { db } from './server/db.ts';
import { decryptSecret, encryptSecret, hashPassword, maskToken, verifyPassword } from './server/security.ts';
import { billzService } from './server/billz.ts';
import type { Banner, Branch, Category, Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, PaymentTransaction, Product, Review, User } from './src/types/index.ts';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Configure uploads directory (configurable via UPLOADS_DIR or persistent DATA_DIR for Render Disks)
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : (process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR, 'uploads') : path.resolve(__dirname, 'public/uploads'));
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'shu-' + uniqueSuffix + ext);
  },
});

const imageExtensions = /\.(jpg|jpeg|png|webp|gif|svg|avif|heic|heif|bmp)$/i;

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    const isImageMime = file.mimetype && file.mimetype.startsWith('image/');
    const isImageExt = imageExtensions.test(file.originalname || '');
    if (isImageMime || isImageExt) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari (JPG, PNG, WebP, HEIC) yuklanishi mumkin!'));
    }
  },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets
app.use('/uploads', express.static(UPLOADS_DIR));
if (UPLOADS_DIR !== path.resolve(__dirname, 'public/uploads')) {
  app.use('/uploads', express.static(path.resolve(__dirname, 'public/uploads')));
}
app.use(express.static(path.resolve(__dirname, 'public')));

// --- API ENDPOINTS ---

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', brand: 'SHU BREND', timestamp: new Date().toISOString() });
});

// Single file upload endpoint with safe error handling
app.post('/api/upload', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Rasm yuklashda xatolik yuz berdi' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Rasm fayli tanlanmadi' });
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ url: publicUrl, filename: req.file.filename });
  });
});

// Multiple files upload endpoint with safe error handling
app.post('/api/upload-multiple', (req: Request, res: Response) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Rasmlar yuklashda xatolik yuz berdi' });
    }
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Rasm fayllari tanlanmadi' });
    }
    const urls = files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  });
});

// Base64 direct image upload endpoint for phone gallery and direct fallback
app.post('/api/upload-base64', (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Rasm ma‘lumotlari berilmadi' });
    }
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = '.jpg';
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('svg')) ext = '.svg';
      else if (mime.includes('gif')) ext = '.gif';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(data, 'base64');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fname = 'shu-' + uniqueSuffix + (filename ? (path.extname(filename).toLowerCase() || ext) : ext);
    const filePath = path.join(UPLOADS_DIR, fname);
    fs.writeFileSync(filePath, buffer);

    res.json({ url: `/uploads/${fname}`, filename: fname });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Base64 rasm saqlashda xatolik yuz berdi' });
  }
});

// Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Banners
app.get('/api/banners', (_req: Request, res: Response) => {
  res.json(db.getBanners());
});

app.post('/api/banners', (req: Request, res: Response) => {
  const newBanner: Banner = {
    id: 'ban_' + Date.now(),
    title: req.body.title || 'Yangi to‘plam',
    subtitle: req.body.subtitle || '',
    buttonText: req.body.buttonText || 'Kolleksiyani ko‘rish',
    buttonLink: req.body.buttonLink || '/clothing',
    imageUrl: req.body.imageUrl || '/banners/hero-banner-1.png',
    badge: req.body.badge || '',
    isActive: req.body.isActive ?? true,
    sortOrder: Number(req.body.sortOrder) || db.getBanners().length + 1,
  };
  const saved = db.saveBanner(newBanner);
  res.status(201).json(saved);
});

app.put('/api/banners/:id', (req: Request, res: Response) => {
  const banner = db.getBanners().find(b => b.id === req.params.id);
  if (!banner) return res.status(404).json({ error: 'Banner topilmadi' });
  const updated: Banner = { ...banner, ...req.body };
  db.saveBanner(updated);
  res.json(updated);
});

app.delete('/api/banners/:id', (req: Request, res: Response) => {
  db.deleteBanner(req.params.id);
  res.json({ success: true });
});

// Categories
app.get('/api/categories', (req: Request, res: Response) => {
  const includeHidden = req.query.includeHidden === 'true';
  res.json(db.getCategories(includeHidden));
});

app.post('/api/categories', (req: Request, res: Response) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Kategoriya nomi kiritilishi shart' });
  const slug = req.body.slug ? String(req.body.slug).trim() : name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const newCat: Category = {
    id: 'cat_' + Date.now(),
    name,
    slug,
    imageUrl: req.body.imageUrl || '',
    sortOrder: Number(req.body.sortOrder) || db.getCategories(true).length + 1,
    isHidden: Boolean(req.body.isHidden),
  };
  const saved = db.saveCategory(newCat);
  res.status(201).json(saved);
});

app.put('/api/categories/:id', (req: Request, res: Response) => {
  const cat = db.getCategories(true).find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Kategoriya topilmadi' });
  const updated: Category = {
    ...cat,
    name: req.body.name !== undefined ? String(req.body.name).trim() : cat.name,
    slug: req.body.slug !== undefined ? String(req.body.slug).trim() : cat.slug,
    imageUrl: req.body.imageUrl !== undefined ? req.body.imageUrl : cat.imageUrl,
    sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : cat.sortOrder,
    isHidden: req.body.isHidden !== undefined ? Boolean(req.body.isHidden) : cat.isHidden,
  };
  db.saveCategory(updated);
  res.json(updated);
});

app.post('/api/categories/:id/move-products', (req: Request, res: Response) => {
  const { targetCategorySlug } = req.body;
  const sourceCat = db.getCategories(true).find(c => c.id === req.params.id);
  if (!sourceCat) return res.status(404).json({ error: 'Asosiy kategoriya topilmadi' });
  const targetCat = db.getCategories(true).find(c => c.slug === targetCategorySlug);
  if (!targetCat) return res.status(400).json({ error: 'Ko‘chiriladigan target kategoriya topilmadi' });

  const movedCount = db.moveProductsCategory(sourceCat.slug, targetCat.slug, targetCat.name);
  res.json({ success: true, movedCount });
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  const cat = db.getCategories(true).find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Kategoriya topilmadi' });

  const productsInCat = db.getProducts().filter(p => p.categorySlug === cat.slug);
  if (productsInCat.length > 0 && req.query.force !== 'true') {
    return res.status(400).json({
      error: `Ushbu kategoriyada ${productsInCat.length} ta mahsulot mavjud! Mahsulotlar yo‘qolib ketmasligi uchun avval ularni boshqa kategoriyaga o‘tkazing yoki kategoriyani vaqtincha yashiring.`,
      productCount: productsInCat.length,
      hasProducts: true
    });
  }

  db.deleteCategory(req.params.id);
  res.json({ success: true });
});

// Products
app.get('/api/products', (req: Request, res: Response) => {
  let products = db.getProducts();

  const { category, search, minPrice, maxPrice, size, color, sort, includeHidden } = req.query;

  // For customer views (when includeHidden !== 'true'), hide products from hidden seasonal categories
  if (includeHidden !== 'true') {
    const hiddenSlugs = new Set(db.getCategories(true).filter(c => c.isHidden).map(c => c.slug));
    products = products.filter(p => !hiddenSlugs.has(p.categorySlug));
  }

  if (category && category !== 'all') {
    products = products.filter(p => p.categorySlug === category);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    );
  }

  if (minPrice) {
    const min = Number(minPrice);
    if (!isNaN(min)) products = products.filter(p => p.price >= min);
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    if (!isNaN(max)) products = products.filter(p => p.price <= max);
  }

  if (size && typeof size === 'string') {
    products = products.filter(p => p.sizes.includes(size));
  }

  if (color && typeof color === 'string') {
    products = products.filter(p => p.colors.some(c => c.toLowerCase() === color.toLowerCase()));
  }

  if (sort === 'price_asc') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    products.sort((a, b) => b.price - a.price);
  } else if (sort === 'newest') {
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'popular') {
    products.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  res.json(products);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const prod = db.getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: 'Mahsulot topilmadi' });
  const isHiddenCat = db.getCategories(true).some(c => c.slug === prod.categorySlug && c.isHidden);
  if (isHiddenCat && req.query.includeHidden !== 'true') {
    return res.status(404).json({ error: 'Ushbu mahsulot hozirgi mavsumda onlayn sotuvga yopiq' });
  }
  res.json(prod);
});

app.post('/api/products', (req: Request, res: Response) => {
  const body = req.body;
  const name = body.name ? String(body.name).trim() : '';
  const price = Number(String(body.price || '').replace(/[^\d.]/g, ''));
  if (!name || isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Mahsulot nomi va to‘g‘ri narxi talab qilinadi' });
  }

  const rawDiscount = body.discountPrice !== undefined && body.discountPrice !== null && String(body.discountPrice).trim() !== ''
    ? Number(String(body.discountPrice).replace(/[^\d.]/g, ''))
    : undefined;
  const discountPrice = rawDiscount && rawDiscount > 0 ? rawDiscount : undefined;

  const rawStock = body.stock !== undefined ? Number(String(body.stock).replace(/[^\d]/g, '')) : 10;
  const stock = !isNaN(rawStock) && rawStock >= 0 ? rawStock : 10;

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
  const images = Array.isArray(body.images) && body.images.length > 0 ? body.images : ['/banners/hero-banner-1.png'];
  const sizes = Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ['S', 'M', 'L', 'XL'];
  const colors = Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : ['Qora'];

  const newProduct: Product = {
    id: 'prod_' + Date.now(),
    name,
    slug,
    categorySlug: body.categorySlug || 'kurtka',
    categoryName: body.categoryName || (body.categorySlug ? body.categorySlug.toUpperCase() : 'KURTKA'),
    price,
    discountPrice,
    description: body.description || '',
    images,
    sizes,
    colors,
    stock,
    rating: 5.0,
    reviewCount: 0,
    isNew: body.isNew ?? true,
    isTrending: body.isTrending ?? false,
    isFeatured: body.isFeatured ?? true,
    details: body.details || {
      material: 'Oliy sifatli mato',
      season: 'Barcha fasllar',
      fit: 'Regular Luxury Fit',
      origin: 'Turkiya',
    },
    createdAt: new Date().toISOString(),
  };

  const saved = db.saveProduct(newProduct);
  res.status(201).json(saved);
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const prod = db.getProductById(req.params.id);
  if (!prod) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  const body = req.body;
  const cleanPrice = body.price !== undefined ? Number(String(body.price).replace(/[^\d.]/g, '')) : prod.price;
  const rawDiscount = body.discountPrice !== undefined && body.discountPrice !== null && String(body.discountPrice).trim() !== ''
    ? Number(String(body.discountPrice).replace(/[^\d.]/g, ''))
    : (body.discountPrice === null || body.discountPrice === '' ? undefined : prod.discountPrice);
  const cleanDiscount = rawDiscount && rawDiscount > 0 ? rawDiscount : undefined;

  const cleanStock = body.stock !== undefined ? Number(String(body.stock).replace(/[^\d]/g, '')) : prod.stock;

  const updated: Product = {
    ...prod,
    ...body,
    name: body.name ? String(body.name).trim() : prod.name,
    price: !isNaN(cleanPrice) && cleanPrice > 0 ? cleanPrice : prod.price,
    discountPrice: cleanDiscount,
    stock: !isNaN(cleanStock) ? cleanStock : prod.stock,
    images: Array.isArray(body.images) && body.images.length > 0 ? body.images : prod.images,
    sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : prod.sizes,
    colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : prod.colors,
  };

  db.saveProduct(updated);
  res.json(updated);
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  db.deleteProduct(req.params.id);
  res.json({ success: true });
});

app.delete('/api/products-clear-all', (_req: Request, res: Response) => {
  db.clearAllProducts();
  res.json({ success: true, message: 'Barcha mahsulotlar muvaffaqiyatli o‘chirildi' });
});

// --- OMBOR (WAREHOUSE & INVENTORY) API ENDPOINTS ---

app.get('/api/inventory/stats', (_req: Request, res: Response) => {
  try {
    const stats = db.getWarehouseStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Ombor statistikasini olishda xatolik: ' + err.message });
  }
});

app.get('/api/inventory/logs', (req: Request, res: Response) => {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const logs = db.getInventoryLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Ombor harakatlari tarixini olishda xatolik: ' + err.message });
  }
});

app.post('/api/inventory/adjust', (req: Request, res: Response) => {
  try {
    const { productId, color, size, delta, type, note, price, operator } = req.body;
    if (!productId || !color || !size || delta === undefined) {
      return res.status(400).json({ error: 'Mahsulot ID, rang, razmer va soni (delta) talab qilinadi' });
    }

    const numDelta = Number(delta);
    if (isNaN(numDelta) || numDelta === 0) {
      return res.status(400).json({ error: 'O‘zgarish soni nol bo‘lmagan raqam bo‘lishi kerak' });
    }

    const actionType = type || (numDelta < 0 ? 'OFFLINE_SALE' : 'RESTOCK');
    const result = db.adjustVariantStock(
      productId,
      String(color).trim(),
      String(size).trim(),
      numDelta,
      actionType,
      note,
      price ? Number(price) : undefined,
      operator || 'Admin'
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Ombor qoldig‘ini o‘zgartirib bo‘lmadi' });
  }
});

app.post('/api/inventory/set-stock', (req: Request, res: Response) => {
  try {
    const { productId, color, size, stock, type, note, operator } = req.body;
    if (!productId || !color || !size || stock === undefined) {
      return res.status(400).json({ error: 'Mahsulot ID, rang, razmer va qoldiq soni talab qilinadi' });
    }

    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ error: 'Qoldiq soni manfiy bo‘lmasligi kerak' });
    }

    const result = db.setVariantStock(
      productId,
      String(color).trim(),
      String(size).trim(),
      numStock,
      type || 'MANUAL_ADJUST',
      note,
      operator || 'Admin'
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Qoldiqni saqlab bo‘lmadi' });
  }
});

app.post('/api/inventory/add-variant', (req: Request, res: Response) => {
  try {
    const { productId, color, size, stock } = req.body;
    if (!productId || !color || !size) {
      return res.status(400).json({ error: 'Mahsulot ID, rang va razmer talab qilinadi' });
    }

    const numStock = Math.max(0, Number(stock) || 0);
    const updated = db.addVariant(productId, String(color).trim(), String(size).trim(), numStock);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Variant qo‘shishda xatolik' });
  }
});

app.post('/api/inventory/cancel-log/:id', (req: Request, res: Response) => {
  try {
    const result = db.cancelInventoryLog(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Harakatni bekor qilib bo‘lmadi' });
  }
});

// --- BILLZ INTEGRATION API ENDPOINTS ---

app.get('/api/billz/settings', (_req: Request, res: Response) => {
  try {
    const settings = billzService.getPublicSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'BILLZ sozlamalarini olishda xatolik: ' + err.message });
  }
});

app.put('/api/billz/settings', (req: Request, res: Response) => {
  try {
    const updated = billzService.updateSettings(req.body);
    res.json({ success: true, message: 'BILLZ sozlamalari muvaffaqiyatli saqlandi', settings: updated });
  } catch (err: any) {
    res.status(400).json({ error: 'BILLZ sozlamalarini saqlashda xatolik: ' + err.message });
  }
});

app.post('/api/billz/test-connection', async (req: Request, res: Response) => {
  try {
    const result = await billzService.testConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'ERROR', message: err.message });
  }
});

app.post('/api/billz/sync-products', async (_req: Request, res: Response) => {
  try {
    const result = await billzService.syncProducts();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, errors: [err.message] });
  }
});

app.get('/api/billz/logs', (req: Request, res: Response) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const logs = db.getBillzLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/billz/sync-order/:id', async (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
  try {
    const result = await billzService.syncSaleOrder(order);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- BRANCHES MANAGEMENT API ENDPOINTS ---

app.get('/api/branches', (_req: Request, res: Response) => {
  try {
    res.json(db.getBranches());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', (req: Request, res: Response) => {
  try {
    const { name, billzShopId, address, phone, isCentral } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'Filial nomi va manzili kiritilishi shart' });
    }
    const newBranch: Branch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: String(name).trim(),
      billzShopId: billzShopId ? String(billzShopId).trim() : undefined,
      address: String(address).trim(),
      phone: phone ? String(phone).trim() : undefined,
      isActive: true,
      isCentral: Boolean(isCentral),
      createdAt: new Date().toISOString(),
    };
    db.saveBranch(newBranch);
    res.status(201).json(newBranch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/branches/:id', (req: Request, res: Response) => {
  try {
    const existing = db.getBranchById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Filial topilmadi' });
    const updated = db.saveBranch({ ...existing, ...req.body, id: existing.id });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/branches/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteBranch(req.params.id);
    if (!success) {
      return res.status(400).json({ error: 'Yagona markaziy filialni o‘chirib bo‘lmaydi' });
    }
    res.json({ success: true, message: 'Filial muvaffaqiyatli o‘chirildi' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Orders
app.get('/api/orders', (req: Request, res: Response) => {
  const { userId, phone, status, search } = req.query;
  let orders = db.getOrders();

  if (userId) {
    orders = orders.filter(o => o.userId === userId);
  }

  if (phone && typeof phone === 'string') {
    const cleanPhone = phone.replace(/\D/g, '');
    orders = orders.filter(o => o.customerPhone.replace(/\D/g, '').includes(cleanPhone));
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    orders = orders.filter(o => o.status === status);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase();
    orders = orders.filter(o =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.address.toLowerCase().includes(q)
    );
  }

  res.json(orders);
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
  res.json(order);
});

// Helper: Send Telegram Order Notification with Product Photos
async function sendTelegramOrderNotification(order: Order) {
  try {
    const internalSettings = db.getInternalSettings();
    const tg = internalSettings.telegramSettings;
    const token = db.getTelegramDecryptedToken();

    if (!tg || !tg.enabled || !token || !tg.chatId) {
      return { success: false, reason: 'Telegram integratsiyasi o‘chirilgan yoki sozlanmagan' };
    }

    const payMethodName =
      order.paymentMethod === 'PAYNET_CARD'
        ? '💳 Paynet orqali kartaga o‘tkazma'
        : order.paymentMethod === 'CLICK_CARD'
        ? '💳 Click orqali kartaga o‘tkazma'
        : order.paymentMethod === 'PAYME'
        ? '💳 Payme'
        : order.paymentMethod === 'CLICK'
        ? '💳 Click'
        : '💳 Kartaga o‘tkazma';

    const payStatusName =
      order.paymentStatus === 'TOLANDI'
        ? '🟢 To‘landi'
        : order.paymentStatus === 'BEKOR_QILINDI'
        ? '🔴 Bekor qilindi'
        : '🟡 To‘lov kutilmoqda';

    let mapHtml = '<i>Belgilanmagan</i>';
    if (order.location?.lat && order.location?.lng) {
      const { lat, lng } = order.location;
      mapHtml = `<a href="https://maps.google.com/?q=${lat},${lng}">Google Maps</a> | <a href="https://yandex.uz/maps/?pt=${lng},${lat}&z=16&l=map">Yandex Xarita</a>\n   📍 Koordinatalar: <code>${lat.toFixed(5)}, ${lng.toFixed(5)}</code>`;
    }

    const defaultFallbackPhoto = 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop';

    const isPlaceholderToken = !token || token.includes('Test') || token.startsWith('7123456789') || token.length < 25;
    if (isPlaceholderToken) {
      // Gracefully skip external network request when token is a dummy placeholder or not configured
      return { success: false, reason: 'Telegram bot tokeni hali haqiqiy botga ulanmagan' };
    }

    // Send photo for each ordered item as required
    let sentCount = 0;
    for (let i = 0; i < order.items.length; i++) {
      const it = order.items[i];
      const itemPhotoUrl = it.productImage && it.productImage.startsWith('http')
        ? it.productImage
        : defaultFallbackPhoto;

      const caption =
        `📦 <b>BUYURTMA ${order.orderNumber}</b> ${order.items.length > 1 ? `(${i + 1}/${order.items.length}-mahsulot)` : ''}\n\n` +
        `👔 <b>Mahsulot:</b> ${it.productName}\n` +
        `📏 <b>O‘lcham:</b> ${it.size} | 🎨 <b>Rang:</b> ${it.color}\n` +
        `🔢 <b>Soni:</b> ${it.quantity} ta\n` +
        `💰 <b>Narxi:</b> ${it.unitPrice.toLocaleString('uz-UZ')} so‘m\n` +
        `💵 <b>Jami mahsulot:</b> ${it.totalPrice.toLocaleString('uz-UZ')} so‘m\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💵 <b>Umumiy summa:</b> <b>${order.total.toLocaleString('uz-UZ')} so‘m</b>\n` +
        `👤 <b>Mijoz:</b> ${order.customerName}\n` +
        `📞 <b>Telefon:</b> ${order.customerPhone}\n` +
        `📍 <b>Yetkazib berish manzili:</b> ${order.region}, ${order.city}, ${order.address}\n` +
        `🗺 <b>Lokatsiya:</b> ${mapHtml}\n` +
        `💳 <b>To‘lov:</b> ${payMethodName}\n` +
        `🟡 <b>Holati:</b> ${payStatusName}\n` +
        (order.note ? `📝 <b>Izoh:</b> <i>${order.note}</i>\n` : '') +
        `\n👑 <i>SHU BREND — Luxury Men's Store</i>`;

      try {
        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tg.chatId,
            photo: itemPhotoUrl,
            caption: caption,
            parse_mode: 'HTML',
          }),
        });
        const photoData = await photoRes.json();
        if (photoData.ok) {
          sentCount++;
        } else {
          // If token is unauthorized, stop further attempts immediately
          if (photoData.error_code === 401 || String(photoData.description).toLowerCase().includes('unauthorized')) {
            return { success: false, reason: 'Telegram bot tokeni yaroqsiz (Unauthorized)' };
          }

          // Only fallback to sendMessage if error was specifically photo-related
          try {
            const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: tg.chatId,
                text: caption,
                parse_mode: 'HTML',
              }),
            });
            const msgData = await msgRes.json();
            if (msgData.ok) {
              sentCount++;
            }
          } catch {
            // fail-safe
          }
        }
      } catch (itemErr: any) {
        console.warn('Telegram item send error:', itemErr.message);
      }
    }


    return { success: sentCount > 0, sentCount };
  } catch (err: any) {
    console.error('sendTelegramOrderNotification error (fail-safe):', err.message);
    return { success: false, error: err.message };
  }
}

// Telegram Status Endpoint (checks getMe live via Telegram Bot API)
app.get('/api/telegram/status', async (_req: Request, res: Response) => {
  const rawSettings = db.getInternalSettings();
  const tg = rawSettings.telegramSettings;
  const token = db.getTelegramDecryptedToken();
  const chatId = tg?.chatId || '';
  const enabled = tg?.enabled ?? false;

  if (!token) {
    return res.json({
      connected: false,
      status: 'DISCONNECTED',
      hasToken: false,
      tokenMasked: '',
      chatId,
      enabled: false,
      message: 'Telegram Bot Token hali kiritilmagan',
    });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await tgRes.json();

    if (data.ok && data.result) {
      return res.json({
        connected: true,
        status: 'CONNECTED',
        hasToken: true,
        tokenMasked: maskToken(token),
        chatId,
        enabled,
        bot: data.result,
        botUsername: data.result.username,
        botFirstName: data.result.first_name,
        message: `@${data.result.username} muvaffaqiyatli ulangan`,
      });
    } else {
      return res.json({
        connected: false,
        status: 'ERROR',
        hasToken: true,
        tokenMasked: maskToken(token),
        chatId,
        enabled,
        error: data.description || 'Telegram Bot Token yaroqsiz',
      });
    }
  } catch (err: any) {
    return res.json({
      connected: false,
      status: 'ERROR',
      hasToken: true,
      tokenMasked: maskToken(token),
      chatId,
      enabled,
      error: 'Telegram serveriga ulanishda tarmoq xatosi: ' + err.message,
    });
  }
});

// Telegram Connect & Verify Endpoint
app.post('/api/telegram/connect', async (req: Request, res: Response) => {
  const { botToken, chatId } = req.body;
  const cleanToken = botToken && !botToken.includes('••••') ? botToken.trim() : db.getTelegramDecryptedToken();
  const cleanChat = chatId !== undefined && String(chatId).trim() !== '' ? String(chatId).trim() : (db.getInternalSettings().telegramSettings?.chatId || '');

  if (!cleanToken) {
    return res.status(400).json({ error: 'Iltimos, Telegram Bot Tokenni kiriting' });
  }

  try {
    // Check getMe via Telegram Bot API
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await tgRes.json();

    if (!data.ok) {
      return res.status(400).json({
        error: 'Telegram botga ulanib bo‘lmadi: ' + (data.description || 'Token noto‘g‘ri'),
      });
    }

    const botUser = data.result;
    const current = db.getInternalSettings();

    db.updateSettings({
      telegramSettings: {
        ...current.telegramSettings,
        enabled: true,
        botToken: cleanToken,
        chatId: cleanChat,
        botUsername: botUser?.username,
        botFirstName: botUser?.first_name,
        lastTestedAt: new Date().toISOString(),
        status: 'CONNECTED',
      },
    });

    res.json({
      success: true,
      connected: true,
      message: `Telegram bot @${botUser?.username} muvaffaqiyatli ulandi!`,
      bot: botUser,
      chatId: cleanChat,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Telegram serveriga ulanishda xatolik: ' + err.message });
  }
});

// Telegram Disconnect Endpoint
app.post('/api/telegram/disconnect', (_req: Request, res: Response) => {
  const current = db.getInternalSettings();
  db.updateSettings({
    telegramSettings: {
      ...current.telegramSettings,
      chatId: current.telegramSettings?.chatId || '',
      enabled: false,
      status: 'DISCONNECTED',
    },
  });
  res.json({ success: true, message: 'Telegram bot ulanishi uzildi' });

});

// Telegram Save Endpoint
app.post('/api/telegram/save', (req: Request, res: Response) => {
  const { botToken, chatId, enabled } = req.body;
  const current = db.getInternalSettings();
  const incomingToken = botToken && !botToken.includes('••••') ? botToken.trim() : undefined;

  db.updateSettings({
    telegramSettings: {
      ...current.telegramSettings,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      botToken: incomingToken,
      chatId: chatId !== undefined ? String(chatId).trim() : current.telegramSettings?.chatId || '',
    },
  });

  res.json({ success: true, message: 'Telegram sozlamalari muvaffaqiyatli saqlandi' });
});

// Telegram Test endpoint (User specification exact text)
app.post('/api/telegram/test', async (req: Request, res: Response) => {
  const { botToken, chatId } = req.body;
  const token = botToken && !botToken.includes('••••') ? botToken.trim() : db.getTelegramDecryptedToken();
  const chat = chatId || db.getInternalSettings().telegramSettings?.chatId;

  if (!token) {
    return res.status(400).json({ error: 'Telegram Bot Token kiritilmagan' });
  }
  if (!chat) {
    return res.status(400).json({ error: 'Telegram Chat ID kiritilmagan' });
  }

  try {
    const testText =
      `🛍 <b>SHU BREND</b>\n\n` +
      `✅ Telegram bot muvaffaqiyatli ulandi!\n\n` +
      `🤖 Bot ishlamoqda.\n\n` +
      `📨 Admin panel bilan aloqa o‘rnatildi.\n\n` +
      `⏱ Sana: ${new Date().toLocaleString('uz-UZ')}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: testText,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(400).json({ error: tgData.description || 'Telegram xabar yuborishda xatolik yuz berdi' });
    }

    res.json({ success: true, message: 'Test xabari Telegramga muvaffaqiyatli yuborildi!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Telegram serveriga ulanishda xatolik yuz berdi' });
  }
});


app.post('/api/orders', async (req: Request, res: Response) => {
  const { customerName, customerPhone, region, city, address, location, note, items, userId, paymentMethod } = req.body;

  if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Iltimos, ism, telefon va buyurtma mahsulotlarini kiriting' });
  }

  // Validate that items do not belong to seasonally hidden categories
  const hiddenSlugs = new Set(db.getCategories(true).filter(c => c.isHidden).map(c => c.slug));
  for (const item of items) {
    const product = db.getProductById(item.productId);
    if (product && hiddenSlugs.has(product.categorySlug)) {
      return res.status(400).json({
        error: `"${product.name}" mahsuloti hozirgi mavsumda onlayn sotuvga yopiq!`
      });
    }
  }

  // 1. Validate available stock per color and size variant before proceeding
  for (const item of items) {
    const product = db.getProductById(item.productId);
    if (product) {
      const sanitized = db.sanitizeProduct(product);
      const chosenColor = (item.color || sanitized.colors[0] || 'Qora').trim();
      const chosenSize = (item.size || sanitized.sizes[0] || 'L').trim();
      const qty = Math.max(1, Number(item.quantity) || 1);

      const variant = sanitized.variants?.find(
        v => v.color.trim().toLowerCase() === chosenColor.toLowerCase() &&
             v.size.trim().toLowerCase() === chosenSize.toLowerCase()
      );

      const availableStock = variant !== undefined ? variant.stock : sanitized.stock;
      if (availableStock < qty) {
        return res.status(400).json({
          error: `"${product.name}" (${chosenColor}, ${chosenSize}) omborda yetarli emas! Omborda mavjud: ${availableStock} ta, siz so‘ragan: ${qty} ta.`
        });
      }
    }
  }

  const existingOrders = db.getOrders();
  const nextNumber = existingOrders.length > 0
    ? '#' + (1020 + existingOrders.length)
    : '#1025';

  // 2. Calculate pricing & freeze prices in OrderItem, then safely deduct from warehouse
  let subtotal = 0;
  const processedItems: OrderItem[] = [];

  for (const item of items) {
    const product = db.getProductById(item.productId);
    const unitPrice = product ? product.price : Number(item.unitPrice || 0);
    const qty = Math.max(1, Number(item.quantity) || 1);
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;

    const chosenColor = item.color || (product ? product.colors[0] : 'Qora');
    const chosenSize = item.size || (product ? product.sizes[0] : 'L');

    processedItems.push({
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: item.productId,
      productName: product ? product.name : (item.productName || 'Kiyim'),
      productImage: product && product.images[0] ? product.images[0] : (item.productImage || '/banners/hero-banner-1.png'),
      categoryName: product ? product.categoryName : (item.categoryName || 'Erkaklar kiyimi'),
      size: chosenSize,
      color: chosenColor,
      quantity: qty,
      unitPrice,
      totalPrice: itemTotal,
    });

    // Safely deduct from unified warehouse variant & record log
    if (product) {
      try {
        db.adjustVariantStock(
          item.productId,
          chosenColor,
          chosenSize,
          -qty,
          'ONLINE_ORDER_RESERVED',
          `Onlayn buyurtma ${nextNumber} uchun band qilindi`,
          unitPrice,
          customerName
        );
      } catch (err: any) {
        console.warn('Ombor zaxirasini kamaytirishda ogohlantirish:', err.message);
      }
    }
  }

  const selectedPaymentMethod: PaymentMethod =
    paymentMethod === 'PAYNET_CARD'
      ? 'PAYNET_CARD'
      : paymentMethod === 'PAYME'
      ? 'PAYME'
      : paymentMethod === 'CLICK'
      ? 'CLICK'
      : 'CLICK_CARD';

  const newOrder: Order = {
    id: 'ord_' + Date.now(),
    orderNumber: nextNumber,
    userId: userId || undefined,
    customerName,
    customerPhone,
    region: region || 'Toshkent shahri',
    city: city || 'Toshkent',
    address: address || '',
    location: location || undefined,
    note: note || '',
    items: processedItems,
    subtotal,
    discount: 0,
    deliveryFee: 0, // Free delivery
    total: subtotal,
    paymentMethod: selectedPaymentMethod,
    paymentStatus: 'KUTILMOQDA',
    status: 'YANGI',
    statusHistory: [
      {
        status: 'YANGI',
        changedAt: new Date().toISOString(),
        comment: 'Buyurtma tizimga muvaffaqiyatli qabul qilindi',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = db.saveOrder(newOrder);

  // Send Telegram alert in background
  sendTelegramOrderNotification(saved).catch((err) => {
    console.error('Telegram notification error:', err);
  });

  res.status(201).json(saved);
});

// Update order status (support both PUT and PATCH)
const handleUpdateOrderStatus = (req: Request, res: Response) => {
  const { status, paymentStatus, comment } = req.body;
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

  const oldStatus = order.status;

  if (status) {
    order.status = status as OrderStatus;
    order.statusHistory.push({
      status: status as OrderStatus,
      changedAt: new Date().toISOString(),
      comment: comment || `Holat o‘zgartirildi: ${status}`,
    });

    // If order is cancelled, return reserved items back to warehouse
    if (status === 'BEKOR_QILINDI' && oldStatus !== 'BEKOR_QILINDI') {
      for (const it of order.items) {
        try {
          db.adjustVariantStock(
            it.productId,
            it.color,
            it.size,
            it.quantity,
            'ONLINE_ORDER_CANCELLED',
            `Buyurtma ${order.orderNumber} bekor qilingani sababli omborga qaytarildi`,
            it.unitPrice,
            'Admin'
          );
        } catch (err: any) {
          console.warn('Omborga mahsulotni qaytarishda ogohlantirish:', err.message);
        }
      }
    } else if (oldStatus === 'BEKOR_QILINDI' && status !== 'BEKOR_QILINDI') {
      // Re-activated order from cancelled, re-reserve items
      for (const it of order.items) {
        try {
          db.adjustVariantStock(
            it.productId,
            it.color,
            it.size,
            -it.quantity,
            'ONLINE_ORDER_RESERVED',
            `Buyurtma ${order.orderNumber} qayta tiklangani sababli band qilindi`,
            it.unitPrice,
            'Admin'
          );
        } catch (err: any) {
          console.warn('Mahsulotni qayta band qilishda ogohlantirish:', err.message);
        }
      }
    }
  }

  if (paymentStatus) {
    order.paymentStatus = paymentStatus as PaymentStatus;
  }

  order.updatedAt = new Date().toISOString();
  db.saveOrder(order);

  // Sync sale to BILLZ upon order confirmation if not already synced
  if ((status === 'TASDIQLANDI' || status === 'TAYYORLANMOQDA' || status === 'YETKAZILDI') && !order.billzSaleId) {
    billzService.syncSaleOrder(order).catch((syncErr) => {
      console.warn('BILLZ auto-sync sale error:', syncErr.message);
    });
  }

  res.json(order);
};

app.put('/api/orders/:id/status', handleUpdateOrderStatus);
app.patch('/api/orders/:id/status', handleUpdateOrderStatus);

// Transactions history
app.get('/api/payments/transactions', (_req: Request, res: Response) => {
  res.json(db.getTransactions());
});

// Click Create Invoice URL
app.post('/api/payments/click/create-invoice', (req: Request, res: Response) => {
  const { orderId } = req.body;
  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

  const internalSettings = db.getInternalSettings();
  const click = internalSettings.paymentSettings?.click;
  const serviceId = click?.serviceId || '12345';
  const merchantId = click?.merchantId || '98765';
  const returnUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}/`);

  const paymentUrl = `https://my.click.uz/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${order.total}&transaction_param=${order.id}&return_url=${returnUrl}`;

  res.json({
    paymentUrl,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.total,
    testMode: click?.testMode ?? true,
  });
});

// Click Shop API: Prepare (/api/payments/click/prepare)
app.post('/api/payments/click/prepare', (req: Request, res: Response) => {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    amount,
    action,
    error,
    error_note,
    sign_time,
    sign_string,
  } = req.body;

  const internalSettings = db.getInternalSettings();
  const clickConfig = internalSettings.paymentSettings?.click;

  // Find order by ID or orderNumber
  const order =
    db.getOrderById(String(merchant_trans_id)) ||
    db.getOrders().find((o) => o.orderNumber === String(merchant_trans_id));

  if (!order) {
    return res.json({
      click_trans_id,
      merchant_trans_id,
      error: -5,
      error_note: 'Buyurtma topilmadi (User/Order does not exist)',
    });
  }

  // Validate amount
  const reqAmount = Number(amount);
  if (Math.abs(order.total - reqAmount) > 1) {
    return res.json({
      click_trans_id,
      merchant_trans_id,
      error: -2,
      error_note: 'Buyurtma summasi noto‘g‘ri (Incorrect amount)',
    });
  }

  // Check if already paid
  if (order.paymentStatus === 'TOLANDI') {
    return res.json({
      click_trans_id,
      merchant_trans_id,
      error: -4,
      error_note: 'Buyurtma uchun allaqachon to‘lov qilingan (Already paid)',
    });
  }

  // In production, check MD5 sign string if secretKey configured
  if (clickConfig?.secretKey && !clickConfig.testMode && sign_string) {
    const expected = crypto
      .createHash('md5')
      .update(`${click_trans_id}${service_id}${clickConfig.secretKey}${merchant_trans_id}${amount}${action}${sign_time}`)
      .digest('hex');

    if (expected.toLowerCase() !== String(sign_string).toLowerCase()) {
      return res.json({
        click_trans_id,
        merchant_trans_id,
        error: -1,
        error_note: 'Imzo tekshiruvi xatosi (SIGN CHECK FAILED)',
      });
    }
  }

  // Prepare response
  return res.json({
    click_trans_id,
    merchant_trans_id: order.id,
    merchant_prepare_id: order.id,
    error: 0,
    error_note: 'Success',
  });
});

// Click Shop API: Complete (/api/payments/click/complete)
app.post('/api/payments/click/complete', (req: Request, res: Response) => {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id,
    merchant_prepare_id,
    amount,
    action,
    error,
    error_note,
    sign_time,
    sign_string,
  } = req.body;

  const orderId = merchant_prepare_id || merchant_trans_id;
  const order = db.getOrderById(String(orderId)) || db.getOrders().find((o) => o.orderNumber === String(orderId));

  if (!order) {
    return res.json({
      click_trans_id,
      merchant_trans_id,
      error: -5,
      error_note: 'Buyurtma topilmadi',
    });
  }

  // Check if already processed idempotently
  const existingTx = db.getTransactions().find((t) => t.transactionId === String(click_trans_id));
  if (existingTx && existingTx.status === 'SUCCESS') {
    return res.json({
      click_trans_id,
      merchant_trans_id: order.id,
      merchant_confirm_id: order.id,
      error: 0,
      error_note: 'Success (already completed)',
    });
  }

  if (Number(error) < 0) {
    order.paymentStatus = 'BEKOR_QILINDI';
    order.updatedAt = new Date().toISOString();
    db.saveOrder(order);

    db.saveTransaction({
      id: 'tx_click_' + Date.now(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: 'CLICK',
      amount: Number(amount) || order.total,
      transactionId: String(click_trans_id),
      status: 'CANCELLED',
      rawResponse: JSON.stringify(req.body),
      createdAt: new Date().toISOString(),
    });

    return res.json({
      click_trans_id,
      merchant_trans_id: order.id,
      error,
      error_note: error_note || 'To‘lov bekor qilindi',
    });
  }

  // Mark order paid
  order.paymentStatus = 'TOLANDI';
  if (order.status === 'YANGI') {
    order.status = 'TASDIQLANDI';
    order.statusHistory.push({
      status: 'TASDIQLANDI',
      changedAt: new Date().toISOString(),
      comment: `Click orqali to‘lov qabul qilindi (Tranzaksiya: ${click_trans_id})`,
    });
  }
  order.paymentDetails = {
    provider: 'CLICK',
    transactionId: String(click_trans_id),
    paidAt: new Date().toISOString(),
  };
  order.updatedAt = new Date().toISOString();
  db.saveOrder(order);

  // Record transaction
  db.saveTransaction({
    id: 'tx_click_' + Date.now(),
    orderId: order.id,
    orderNumber: order.orderNumber,
    provider: 'CLICK',
    amount: Number(amount) || order.total,
    transactionId: String(click_trans_id),
    status: 'SUCCESS',
    rawResponse: JSON.stringify(req.body),
    createdAt: new Date().toISOString(),
  });

  return res.json({
    click_trans_id,
    merchant_trans_id: order.id,
    merchant_confirm_id: order.id,
    error: 0,
    error_note: 'Success',
  });
});

// Payme Create Invoice URL
app.post('/api/payments/payme/create-invoice', (req: Request, res: Response) => {
  const { orderId } = req.body;
  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

  const internalSettings = db.getInternalSettings();
  const payme = internalSettings.paymentSettings?.payme;
  const merchantId = payme?.merchantId || '64d2f80c5b3e1a001a123456';
  const amountInTiyin = order.total * 100;

  // Payme checkout base64 format: m=merchant_id;ac.order_id=order_id;a=amount
  const paramsStr = `m=${merchantId};ac.order_id=${order.id};a=${amountInTiyin}`;
  const base64Params = Buffer.from(paramsStr).toString('base64');
  const paymentUrl = `https://checkout.paycom.uz/${base64Params}`;

  res.json({
    paymentUrl,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.total,
    testMode: payme?.testMode ?? true,
  });
});

// Payme JSON-RPC 2.0 endpoint (/api/payments/payme)
app.post('/api/payments/payme', (req: Request, res: Response) => {
  const { method, params, id } = req.body;

  const jsonRpcError = (code: number, messageUz: string) => {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code, message: messageUz },
    });
  };

  if (!method) {
    return jsonRpcError(-32600, 'Method kiritilmadi');
  }

  // 1. CheckPerformTransaction
  if (method === 'CheckPerformTransaction') {
    const orderId = params?.account?.order_id || params?.account?.orderId;
    const amount = Number(params?.amount) / 100;

    const order = db.getOrderById(String(orderId)) || db.getOrders().find((o) => o.orderNumber === String(orderId));
    if (!order) {
      return jsonRpcError(-31050, 'Buyurtma topilmadi');
    }

    if (Math.abs(order.total - amount) > 1) {
      return jsonRpcError(-31001, 'Summa noto‘g‘ri');
    }

    if (order.paymentStatus === 'TOLANDI') {
      return jsonRpcError(-31051, 'Buyurtma uchun allaqachon to‘lov qilingan');
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      result: { allow: true },
    });
  }

  // 2. CreateTransaction
  if (method === 'CreateTransaction') {
    const orderId = params?.account?.order_id || params?.account?.orderId;
    const order = db.getOrderById(String(orderId)) || db.getOrders().find((o) => o.orderNumber === String(orderId));
    if (!order) {
      return jsonRpcError(-31050, 'Buyurtma topilmadi');
    }

    const paymeTransId = String(params?.id);
    const existingTx = db.getTransactions().find((t) => t.transactionId === paymeTransId);

    const txTime = Date.now();
    if (!existingTx) {
      db.saveTransaction({
        id: 'tx_payme_' + txTime,
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: 'PAYME',
        amount: order.total,
        transactionId: paymeTransId,
        status: 'PENDING',
        rawResponse: JSON.stringify(params),
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        create_time: txTime,
        transaction: paymeTransId,
        state: 1,
      },
    });
  }

  // 3. PerformTransaction
  if (method === 'PerformTransaction') {
    const paymeTransId = String(params?.id);
    const tx = db.getTransactions().find((t) => t.transactionId === paymeTransId);

    if (tx) {
      const order = db.getOrderById(tx.orderId);
      if (order) {
        order.paymentStatus = 'TOLANDI';
        if (order.status === 'YANGI') {
          order.status = 'TASDIQLANDI';
          order.statusHistory.push({
            status: 'TASDIQLANDI',
            changedAt: new Date().toISOString(),
            comment: `Payme orqali to‘lov qabul qilindi (Tranzaksiya: ${paymeTransId})`,
          });
        }
        order.paymentDetails = {
          provider: 'PAYME',
          transactionId: paymeTransId,
          paidAt: new Date().toISOString(),
        };
        db.saveOrder(order);
      }

      tx.status = 'SUCCESS';
      db.saveTransaction(tx);
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        transaction: paymeTransId,
        perform_time: Date.now(),
        state: 2,
      },
    });
  }

  // 4. CancelTransaction
  if (method === 'CancelTransaction') {
    const paymeTransId = String(params?.id);
    const tx = db.getTransactions().find((t) => t.transactionId === paymeTransId);
    if (tx) {
      const order = db.getOrderById(tx.orderId);
      if (order) {
        order.paymentStatus = 'BEKOR_QILINDI';
        db.saveOrder(order);
      }
      tx.status = 'CANCELLED';
      db.saveTransaction(tx);
    }

    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        transaction: paymeTransId,
        cancel_time: Date.now(),
        state: -2,
      },
    });
  }

  // 5. CheckTransaction
  if (method === 'CheckTransaction') {
    const paymeTransId = String(params?.id);
    const tx = db.getTransactions().find((t) => t.transactionId === paymeTransId);

    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        create_time: tx ? new Date(tx.createdAt).getTime() : Date.now(),
        perform_time: tx?.status === 'SUCCESS' ? Date.now() : 0,
        cancel_time: tx?.status === 'CANCELLED' ? Date.now() : 0,
        transaction: paymeTransId,
        state: tx?.status === 'SUCCESS' ? 2 : tx?.status === 'CANCELLED' ? -2 : 1,
        reason: null,
      },
    });
  }

  return jsonRpcError(-32601, 'Metod qo‘llab-quvvatlanmaydi');
});

// Payment Simulator (Allows testing Click & Payme in Test Mode from UI)
app.post('/api/payments/simulate', (req: Request, res: Response) => {
  const { orderId, provider, action } = req.body;
  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

  const prov = (provider === 'CLICK' ? 'CLICK' : 'PAYME') as 'CLICK' | 'PAYME';
  const isPay = action !== 'CANCEL';
  const transId = (prov === 'CLICK' ? 'click_sim_' : 'payme_sim_') + Date.now();

  if (isPay) {
    order.paymentStatus = 'TOLANDI';
    if (order.status === 'YANGI') {
      order.status = 'TASDIQLANDI';
      order.statusHistory.push({
        status: 'TASDIQLANDI',
        changedAt: new Date().toISOString(),
        comment: `${prov} orqali test to‘lov amalga oshirildi`,
      });
    }
    order.paymentDetails = {
      provider: prov,
      transactionId: transId,
      paidAt: new Date().toISOString(),
    };
    db.saveOrder(order);

    db.saveTransaction({
      id: 'tx_sim_' + Date.now(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: prov,
      amount: order.total,
      transactionId: transId,
      status: 'SUCCESS',
      rawResponse: `Test mode simulation: ${prov} success for ${order.orderNumber}`,
      createdAt: new Date().toISOString(),
    });
  } else {
    order.paymentStatus = 'BEKOR_QILINDI';
    db.saveOrder(order);

    db.saveTransaction({
      id: 'tx_sim_' + Date.now(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: prov,
      amount: order.total,
      transactionId: transId,
      status: 'CANCELLED',
      rawResponse: `Test mode simulation: ${prov} cancelled for ${order.orderNumber}`,
      createdAt: new Date().toISOString(),
    });
  }

  res.json({
    success: true,
    order,
    message: isPay
      ? `${prov} orqali ${order.total.toLocaleString('uz-UZ')} so‘m to‘lov muvaffaqiyatli amalga oshirildi!`
      : `${prov} to‘lovi bekor qilindi`,
  });
});


// Admin stats
app.get('/api/admin/stats', (_req: Request, res: Response) => {
  res.json(db.getAdminStats());
});

// Reviews
app.get('/api/reviews', (req: Request, res: Response) => {
  const { productId } = req.query;
  res.json(db.getReviews(typeof productId === 'string' ? productId : undefined));
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const { productId, userId, userName, rating, comment } = req.body;
  if (!productId || !comment || !rating) {
    return res.status(400).json({ error: 'Baho va izoh talab qilinadi' });
  }

  const product = db.getProductById(productId);
  const newReview: Review = {
    id: 'rev_' + Date.now(),
    productId,
    productName: product ? product.name : undefined,
    userId: userId || 'usr_guest',
    userName: userName || 'Xaridor',
    rating: Number(rating),
    comment,
    isApproved: true,
    createdAt: new Date().toISOString(),
  };

  db.saveReview(newReview);

  // Recalculate product rating
  if (product) {
    const reviews = db.getReviews(productId);
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    product.rating = Number(avg.toFixed(1));
    product.reviewCount = reviews.length;
    db.saveProduct(product);
  }

  res.status(201).json(newReview);
});

// Admin Security Info (Public meta: username & last changed date only)
app.get('/api/admin/security', (_req: Request, res: Response) => {
  const sec = db.getAdminSecurity();
  res.json({
    username: sec.username,
    lastPasswordChange: sec.lastPasswordChange,
  });
});

// Admin Change Login Endpoint
app.post('/api/admin/change-login', (req: Request, res: Response) => {
  const { newUsername, currentPassword } = req.body;
  if (!newUsername || !currentPassword) {
    return res.status(400).json({ error: 'Yangi login va joriy parol kiritilishi shart!' });
  }

  const sec = db.getAdminSecurity();
  const cleanNew = String(newUsername).trim().toLowerCase();

  if (cleanNew.length < 3) {
    return res.status(400).json({ error: 'Yangi login kamida 3 ta belgidan iborat bo‘lishi kerak!' });
  }

  // Verify current password first
  if (!verifyPassword(String(currentPassword).trim(), sec.passwordHash)) {
    return res.status(401).json({ error: 'Joriy parol noto‘g‘ri! Login o‘zgartirilmadi.' });
  }

  // Update login
  db.updateAdminSecurity({ username: cleanNew });

  // Update admin user profile if exists
  const adminUser = db.getUsers().find(u => u.role === 'ADMIN');
  if (adminUser) {
    adminUser.name = `Admin (${cleanNew})`;
    db.saveUser(adminUser);
  }

  res.json({
    success: true,
    message: `Admin logini muvaffaqiyatli o‘zgartirildi! Yangi login: "${cleanNew}"`,
    username: cleanNew,
  });
});

// Admin Change Password Endpoint (bcrypt/scrypt, >= 12 chars, session invalidation)
app.post('/api/admin/change-password', (req: Request, res: Response) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Barcha maydonlarni to‘ldirish shart!' });
  }

  const sec = db.getAdminSecurity();
  const cleanOld = String(oldPassword).trim();
  const cleanNew = String(newPassword).trim();
  const cleanConfirm = String(confirmPassword).trim();

  // 1. Check old password
  if (!verifyPassword(cleanOld, sec.passwordHash)) {
    return res.status(401).json({ error: 'Eski parol noto‘g‘ri kiritildi!' });
  }

  // 2. Length check: min 12 characters (Requirement 2.2)
  if (cleanNew.length < 12) {
    return res.status(400).json({
      error: `Yangi parol kamida 12 ta belgidan iborat bo‘lishi shart! (Hozirda: ${cleanNew.length} ta belgi)`,
    });
  }

  // 3. Repeat match check (Requirement 2.3)
  if (cleanNew !== cleanConfirm) {
    return res.status(400).json({ error: 'Yangi parol va tasdiqlovchi parol bir-biriga mos kelmadi!' });
  }

  // 4. Secure scrypt hash with random salt (Requirement 2.4, 2.5)
  const newHash = hashPassword(cleanNew);

  // 5. Invalidate existing active admin sessions by bumping sessionTokenVersion (Requirement 2.8)
  const nextSessionVersion = (sec.sessionTokenVersion || 1) + 1;

  db.updateAdminSecurity({
    passwordHash: newHash,
    sessionTokenVersion: nextSessionVersion,
    lastPasswordChange: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Admin paroli muvaffaqiyatli yangilandi! Xavfsizlik talabiga binoan yangi parol bilan qayta kiring.',
    requireReLogin: true,
  });
});

// Admin specific secure authentication endpoint
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { usernameOrPhone, password } = req.body;
  if (!usernameOrPhone || !password) {
    return res.status(400).json({ error: 'Admin login va parol talab qilinadi' });
  }

  const cleanInput = String(usernameOrPhone).trim().toLowerCase();
  const cleanPhone = cleanInput.replace(/\D/g, '');
  const cleanPass = String(password).trim();

  const sec = db.getAdminSecurity();
  const validAdminUsernames = [sec.username.toLowerCase(), 'admin', 'shubrend_admin', 'shubrend', '998901234567'];

  const isUsernameMatch = validAdminUsernames.includes(cleanInput) || validAdminUsernames.includes(cleanPhone);
  const isPasswordMatch = verifyPassword(cleanPass, sec.passwordHash);

  if (isUsernameMatch && isPasswordMatch) {
    let adminUser = db.getUsers().find(u => u.role === 'ADMIN');
    if (!adminUser) {
      adminUser = {
        id: 'usr_admin',
        name: `Admin (${sec.username})`,
        phone: '+998901234567',
        email: 'admin@shubrend.uz',
        role: 'ADMIN',
        region: 'Toshkent shahri',
        city: 'Mirobod tumani',
        address: 'Shahrisabz ko‘chasi, 12-uy',
        createdAt: new Date().toISOString(),
      };
      db.saveUser(adminUser);
    }

    return res.json({
      success: true,
      user: adminUser,
      token: `admin-token-v${sec.sessionTokenVersion || 1}-${Date.now()}`,
      message: 'Admin tizimga muvaffaqiyatli kirdi',
    });
  }

  return res.status(401).json({
    error: 'Login yoki parol noto‘g‘ri! Faqat administratorlar kirishi mumkin.',
  });
});


// Auth
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Telefon raqam va parol kiritilmadi' });
  }

  // Check admin username or phone with secure password verification
  const cleanPhone = phone.replace(/\D/g, '');
  const sec = db.getAdminSecurity();
  const validAdminIdentifiers = [sec.username.toLowerCase(), 'admin', 'shubrend_admin', '998901234567'];
  if (validAdminIdentifiers.includes(phone.toLowerCase()) || validAdminIdentifiers.includes(cleanPhone)) {
    if (verifyPassword(password, sec.passwordHash)) {
      const adminUser = db.getUsers().find(u => u.role === 'ADMIN') || db.getUsers()[0];
      return res.json({
        user: adminUser,
        token: `admin-token-v${sec.sessionTokenVersion || 1}-${Date.now()}`,
      });
    }
  }

  const user = db.getUserByPhone(phone);
  if (!user) {
    // If not found, auto-register as customer for smooth UX
    const newUser: User = {
      id: 'usr_' + Date.now(),
      name: 'Mijoz ' + phone.slice(-4),
      phone,
      role: 'CUSTOMER',
      region: 'Toshkent shahri',
      city: 'Toshkent',
      address: '',
      createdAt: new Date().toISOString(),
    };
    db.saveUser(newUser);
    return res.json({ user: newUser, token: 'cust-token-' + Date.now() });
  }

  res.json({ user, token: 'user-token-' + Date.now() });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, phone, password, region, city, address } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Ism va telefon raqam talab qilinadi' });
  }

  const existing = db.getUserByPhone(phone);
  if (existing) {
    return res.status(400).json({ error: 'Ushbu telefon raqami bilan foydalanuvchi mavjud. Iltimos, kiring.' });
  }

  const newUser: User = {
    id: 'usr_' + Date.now(),
    name,
    phone,
    role: 'CUSTOMER',
    region: region || 'Toshkent shahri',
    city: city || 'Toshkent',
    address: address || '',
    createdAt: new Date().toISOString(),
  };

  db.saveUser(newUser);
  res.status(201).json({ user: newUser, token: 'user-token-' + Date.now() });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const { id, name, phone, email, region, city, address, location } = req.body;
  const user = db.getUserById(id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const updated: User = {
    ...user,
    name: name || user.name,
    phone: phone || user.phone,
    email: email !== undefined ? email : user.email,
    region: region || user.region,
    city: city || user.city,
    address: address !== undefined ? address : user.address,
    location: location !== undefined ? location : user.location,
  };

  db.saveUser(updated);
  res.json(updated);
});

// Setup Vite middleware in Dev or serve static in Prod
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProduction) {
    if (fs.existsSync(distPath)) {
      console.log(`📦 [Production] Serving static files from ${distPath}`);
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn(`⚠️ [Production Warning] dist folder not found at ${distPath}. Please run 'npm run build' first.`);
      app.get('*', (_req: Request, res: Response) => {
        res.status(500).send('Production build not found. Please run "npm run build" before starting the server.');
      });
    }
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false, // Prevents iframe WebSocket disconnection crashes in Google AI Studio Cloud Run preview
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SHU BREND Server running on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

startServer();
