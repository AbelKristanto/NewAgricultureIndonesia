import { UserRole } from '@/types/auth';

export const INDONESIAN_PROVINCES = [
  { value: 'aceh', labelEn: 'Aceh', labelId: 'Aceh' },
  { value: 'sumatera-utara', labelEn: 'North Sumatra', labelId: 'Sumatera Utara' },
  { value: 'sumatera-barat', labelEn: 'West Sumatra', labelId: 'Sumatera Barat' },
  { value: 'riau', labelEn: 'Riau', labelId: 'Riau' },
  { value: 'jambi', labelEn: 'Jambi', labelId: 'Jambi' },
  { value: 'sumatera-selatan', labelEn: 'South Sumatra', labelId: 'Sumatera Selatan' },
  { value: 'bengkulu', labelEn: 'Bengkulu', labelId: 'Bengkulu' },
  { value: 'lampung', labelEn: 'Lampung', labelId: 'Lampung' },
  { value: 'bangka-belitung', labelEn: 'Bangka Belitung', labelId: 'Kepulauan Bangka Belitung' },
  { value: 'kepulauan-riau', labelEn: 'Riau Islands', labelId: 'Kepulauan Riau' },
  { value: 'dki-jakarta', labelEn: 'DKI Jakarta', labelId: 'DKI Jakarta' },
  { value: 'jawa-barat', labelEn: 'West Java', labelId: 'Jawa Barat' },
  { value: 'jawa-tengah', labelEn: 'Central Java', labelId: 'Jawa Tengah' },
  { value: 'di-yogyakarta', labelEn: 'DI Yogyakarta', labelId: 'DI Yogyakarta' },
  { value: 'jawa-timur', labelEn: 'East Java', labelId: 'Jawa Timur' },
  { value: 'banten', labelEn: 'Banten', labelId: 'Banten' },
  { value: 'bali', labelEn: 'Bali', labelId: 'Bali' },
  { value: 'nusa-tenggara-barat', labelEn: 'West Nusa Tenggara', labelId: 'Nusa Tenggara Barat' },
  { value: 'nusa-tenggara-timur', labelEn: 'East Nusa Tenggara', labelId: 'Nusa Tenggara Timur' },
  { value: 'kalimantan-barat', labelEn: 'West Kalimantan', labelId: 'Kalimantan Barat' },
  { value: 'kalimantan-tengah', labelEn: 'Central Kalimantan', labelId: 'Kalimantan Tengah' },
  { value: 'kalimantan-selatan', labelEn: 'South Kalimantan', labelId: 'Kalimantan Selatan' },
  { value: 'kalimantan-timur', labelEn: 'East Kalimantan', labelId: 'Kalimantan Timur' },
  { value: 'kalimantan-utara', labelEn: 'North Kalimantan', labelId: 'Kalimantan Utara' },
  { value: 'sulawesi-utara', labelEn: 'North Sulawesi', labelId: 'Sulawesi Utara' },
  { value: 'sulawesi-tengah', labelEn: 'Central Sulawesi', labelId: 'Sulawesi Tengah' },
  { value: 'sulawesi-selatan', labelEn: 'South Sulawesi', labelId: 'Sulawesi Selatan' },
  { value: 'sulawesi-tenggara', labelEn: 'Southeast Sulawesi', labelId: 'Sulawesi Tenggara' },
  { value: 'gorontalo', labelEn: 'Gorontalo', labelId: 'Gorontalo' },
  { value: 'sulawesi-barat', labelEn: 'West Sulawesi', labelId: 'Sulawesi Barat' },
  { value: 'maluku', labelEn: 'Maluku', labelId: 'Maluku' },
  { value: 'maluku-utara', labelEn: 'North Maluku', labelId: 'Maluku Utara' },
  { value: 'papua', labelEn: 'Papua', labelId: 'Papua' },
  { value: 'papua-barat', labelEn: 'West Papua', labelId: 'Papua Barat' },
  { value: 'papua-selatan', labelEn: 'South Papua', labelId: 'Papua Selatan' },
  { value: 'papua-tengah', labelEn: 'Central Papua', labelId: 'Papua Tengah' },
  { value: 'papua-pegunungan', labelEn: 'Highland Papua', labelId: 'Papua Pegunungan' },
  { value: 'papua-barat-daya', labelEn: 'Southwest Papua', labelId: 'Papua Barat Daya' },
];

export const SOIL_TYPES = [
  { value: 'alluvial', labelEn: 'Alluvial', labelId: 'Aluvial' },
  { value: 'laterite', labelEn: 'Laterite', labelId: 'Laterit' },
  { value: 'red', labelEn: 'Red Soil', labelId: 'Tanah Merah' },
  { value: 'black', labelEn: 'Black Soil', labelId: 'Tanah Hitam' },
  { value: 'sandy', labelEn: 'Sandy Soil', labelId: 'Tanah Berpasir' },
  { value: 'clay', labelEn: 'Clay Soil', labelId: 'Tanah Liat' },
  { value: 'loam', labelEn: 'Loam', labelId: 'Tanah Lempung' },
  { value: 'volcanic', labelEn: 'Volcanic Soil', labelId: 'Tanah Vulkanik' },
];

export const WATER_SOURCES = [
  { value: 'rain-fed', labelEn: 'Rain-fed', labelId: 'Tadah Hujan' },
  { value: 'irrigation', labelEn: 'Irrigation Canal', labelId: 'Saluran Irigasi' },
  { value: 'river', labelEn: 'River', labelId: 'Sungai' },
  { value: 'well', labelEn: 'Well/Groundwater', labelId: 'Sumur/Air Tanah' },
  { value: 'reservoir', labelEn: 'Reservoir', labelId: 'Waduk' },
];

export const COMMODITIES = [
  { value: 'rice', labelEn: 'Rice', labelId: 'Padi/Beras' },
  { value: 'corn', labelEn: 'Corn', labelId: 'Jagung' },
  { value: 'soybean', labelEn: 'Soybean', labelId: 'Kedelai' },
  { value: 'chili', labelEn: 'Chili', labelId: 'Cabai' },
  { value: 'onion', labelEn: 'Shallot/Onion', labelId: 'Bawang Merah' },
  { value: 'garlic', labelEn: 'Garlic', labelId: 'Bawang Putih' },
  { value: 'palm-oil', labelEn: 'Palm Oil', labelId: 'Kelapa Sawit' },
  { value: 'rubber', labelEn: 'Rubber', labelId: 'Karet' },
  { value: 'coffee', labelEn: 'Coffee', labelId: 'Kopi' },
  { value: 'cocoa', labelEn: 'Cocoa', labelId: 'Kakao' },
  { value: 'tea', labelEn: 'Tea', labelId: 'Teh' },
  { value: 'sugarcane', labelEn: 'Sugarcane', labelId: 'Tebu' },
  { value: 'cassava', labelEn: 'Cassava', labelId: 'Singkong' },
  { value: 'potato', labelEn: 'Potato', labelId: 'Kentang' },
  { value: 'tomato', labelEn: 'Tomato', labelId: 'Tomat' },
  { value: 'vegetables', labelEn: 'Vegetables', labelId: 'Sayuran' },
  { value: 'fruits', labelEn: 'Fruits', labelId: 'Buah-buahan' },
  { value: 'spices', labelEn: 'Spices', labelId: 'Rempah-rempah' },
  { value: 'seafood', labelEn: 'Seafood', labelId: 'Hasil Laut' },
  { value: 'other', labelEn: 'Other', labelId: 'Lainnya' },
];

export const QUALITY_GRADES = [
  { value: 'premium', labelEn: 'Premium', labelId: 'Premium' },
  { value: 'grade-a', labelEn: 'Grade A', labelId: 'Grade A' },
  { value: 'grade-b', labelEn: 'Grade B', labelId: 'Grade B' },
  { value: 'standard', labelEn: 'Standard', labelId: 'Standar' },
];

export const LAND_PLOT_STATUSES = [
  { value: 'active', labelEn: 'Actively planted', labelId: 'Aktif ditanami' },
  { value: 'fallow', labelEn: 'Fallow', labelId: 'Bera / kosong' },
  { value: 'harvested', labelEn: 'Recently harvested', labelId: 'Baru dipanen' },
];

export const SUBSIDY_TYPES = [
  { value: 'cash', labelEn: 'Cash assistance', labelId: 'Bantuan tunai' },
  { value: 'input', labelEn: 'Input subsidy', labelId: 'Subsidi sarana produksi' },
  { value: 'equipment', labelEn: 'Equipment aid', labelId: 'Bantuan alat' },
  { value: 'training', labelEn: 'Training program', labelId: 'Program pelatihan' },
  { value: 'other', labelEn: 'Other', labelId: 'Lainnya' },
];

export const SUBSIDY_STATUSES = [
  { value: 'planned', labelEn: 'Planned', labelId: 'Direncanakan' },
  { value: 'applied', labelEn: 'Applied', labelId: 'Diajukan' },
  { value: 'approved', labelEn: 'Approved', labelId: 'Disetujui' },
  { value: 'rejected', labelEn: 'Rejected', labelId: 'Ditolak' },
  { value: 'disbursed', labelEn: 'Disbursed', labelId: 'Dicairkan' },
];

export const INPUT_ITEM_TYPES = [
  { value: 'seed', labelEn: 'Seed', labelId: 'Benih' },
  { value: 'fertilizer', labelEn: 'Fertilizer', labelId: 'Pupuk' },
  { value: 'pesticide', labelEn: 'Pesticide', labelId: 'Pestisida' },
  { value: 'equipment', labelEn: 'Equipment', labelId: 'Alat' },
  { value: 'other', labelEn: 'Other', labelId: 'Lainnya' },
];

export const INPUT_PLAN_STATUSES = [
  { value: 'planned', labelEn: 'Planned', labelId: 'Direncanakan' },
  { value: 'purchased', labelEn: 'Purchased', labelId: 'Sudah dibeli' },
  { value: 'used', labelEn: 'Used', labelId: 'Sudah dipakai' },
];

export const TIMELINE_OPTIONS = [
  { value: '1-season', labelEn: '1 Planting Season', labelId: '1 Musim Tanam' },
  { value: '6-months', labelEn: '6 Months', labelId: '6 Bulan' },
  { value: '1-year', labelEn: '1 Year', labelId: '1 Tahun' },
  { value: '2-years', labelEn: '2 Years', labelId: '2 Tahun' },
];

export const FREQUENCY_OPTIONS = [
  { value: 'one-time', labelEn: 'One-time', labelId: 'Sekali' },
  { value: 'weekly', labelEn: 'Weekly', labelId: 'Mingguan' },
  { value: 'monthly', labelEn: 'Monthly', labelId: 'Bulanan' },
  { value: 'quarterly', labelEn: 'Quarterly', labelId: 'Triwulan' },
];

export const ANALYSIS_TYPES = [
  { value: 'production-capacity', labelEn: 'Production Capacity', labelId: 'Kapasitas Produksi' },
  { value: 'food-supply-gaps', labelEn: 'Food Supply Gaps', labelId: 'Kesenjangan Pasokan Pangan' },
  { value: 'demand-supply', labelEn: 'Demand-Supply Imbalance', labelId: 'Ketidakseimbangan Permintaan-Pasokan' },
  { value: 'risk-zones', labelEn: 'Risk Zones', labelId: 'Zona Risiko' },
  { value: 'import-dependency', labelEn: 'Import Dependency', labelId: 'Ketergantungan Impor' },
];

export const TIME_HORIZONS = [
  { value: 'current-season', labelEn: 'Current Season', labelId: 'Musim Ini' },
  { value: '6-months', labelEn: 'Next 6 Months', labelId: '6 Bulan Ke Depan' },
  { value: '1-year', labelEn: 'Next Year', labelId: 'Tahun Depan' },
  { value: '5-years', labelEn: '5-Year Outlook', labelId: 'Proyeksi 5 Tahun' },
];

export const USER_ROLES: { value: UserRole; labelEn: string; labelId: string; icon: string }[] = [
  { value: 'farmer', labelEn: 'Farmer', labelId: 'Petani', icon: 'Wheat' },
  { value: 'buyer', labelEn: 'Buyer', labelId: 'Pembeli', icon: 'ShoppingCart' },
  { value: 'supplier', labelEn: 'Agricultural Supplier', labelId: 'Pemasok Pertanian', icon: 'Package' },
  { value: 'logistics', labelEn: 'Logistics Provider', labelId: 'Penyedia Logistik', icon: 'Truck' },
  { value: 'finance', labelEn: 'Financial Institution', labelId: 'Lembaga Keuangan', icon: 'Landmark' },
  { value: 'government', labelEn: 'Government Agency', labelId: 'Instansi Pemerintah', icon: 'Building2' },
];

export const MONTHS = [
  { value: '01', labelEn: 'January', labelId: 'Januari' },
  { value: '02', labelEn: 'February', labelId: 'Februari' },
  { value: '03', labelEn: 'March', labelId: 'Maret' },
  { value: '04', labelEn: 'April', labelId: 'April' },
  { value: '05', labelEn: 'May', labelId: 'Mei' },
  { value: '06', labelEn: 'June', labelId: 'Juni' },
  { value: '07', labelEn: 'July', labelId: 'Juli' },
  { value: '08', labelEn: 'August', labelId: 'Agustus' },
  { value: '09', labelEn: 'September', labelId: 'September' },
  { value: '10', labelEn: 'October', labelId: 'Oktober' },
  { value: '11', labelEn: 'November', labelId: 'November' },
  { value: '12', labelEn: 'December', labelId: 'Desember' },
];

export const WEATHER_SCENARIOS = [
  { value: 'drought', labelEn: 'Drought', labelId: 'Kekeringan' },
  { value: 'heavy-rain', labelEn: 'Heavy Rainfall', labelId: 'Hujan Lebat' },
  { value: 'flooding', labelEn: 'Flooding', labelId: 'Banjir' },
  { value: 'heat-wave', labelEn: 'Heat Wave', labelId: 'Gelombang Panas' },
  { value: 'la-nina', labelEn: 'La Nina', labelId: 'La Nina' },
  { value: 'el-nino', labelEn: 'El Nino', labelId: 'El Nino' },
];

export const SEASONS = [
  { value: 'wet-season', labelEn: 'Wet Season (Oct-Mar)', labelId: 'Musim Hujan (Okt-Mar)' },
  { value: 'dry-season', labelEn: 'Dry Season (Apr-Sep)', labelId: 'Musim Kemarau (Apr-Sep)' },
  { value: 'transition', labelEn: 'Transition Period', labelId: 'Musim Pancaroba' },
];

export const TRANSACTION_STATUSES = [
  { value: 'draft', labelEn: 'Draft', labelId: 'Draf', color: 'secondary' },
  { value: 'proposed', labelEn: 'Proposed', labelId: 'Diajukan', color: 'warning' },
  { value: 'accepted', labelEn: 'Accepted', labelId: 'Diterima', color: 'primary' },
  { value: 'in_progress', labelEn: 'In Progress', labelId: 'Berlangsung', color: 'primary' },
  { value: 'completed', labelEn: 'Completed', labelId: 'Selesai', color: 'success' },
  { value: 'cancelled', labelEn: 'Cancelled', labelId: 'Dibatalkan', color: 'danger' },
] as const;
