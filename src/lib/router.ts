import { ModalType } from '../context/AppContext';

// ==============================================================================
// 1. Valid Canonical Route Path Mappings
// ==============================================================================
export const VIEW_ROUTES: Record<string, string> = {
  command_center: '/command-center',
  dashboard: '/command-center',
  sales_pos: '/sales-pos',
  inventory_fefo: '/inventory',
  khata_ledger: '/khata',
  procurement: '/procurement',
  nursery_care: '/nursery',
  compliance: '/compliance',
  intelligence: '/intelligence',
  gst_reports: '/gst-reports',
  users_directory: '/users',
  reset_password: '/reset-password',
  '404': '/404',
};

export const ROUTE_ALIASES: Record<string, string> = {
  // Command Center aliases
  '': 'command_center',
  '/': 'command_center',
  'command-center': 'command_center',
  '/command-center': 'command_center',
  'command_center': 'command_center',
  '/command_center': 'command_center',
  'dashboard': 'command_center',
  '/dashboard': 'command_center',
  'home': 'command_center',
  '/home': 'command_center',

  // Sales POS aliases
  'sales-pos': 'sales_pos',
  '/sales-pos': 'sales_pos',
  'sales_pos': 'sales_pos',
  '/sales_pos': 'sales_pos',
  'sales': 'sales_pos',
  '/sales': 'sales_pos',
  'pos': 'sales_pos',
  '/pos': 'sales_pos',
  'billing': 'sales_pos',
  '/billing': 'sales_pos',

  // Inventory FEFO aliases
  'inventory': 'inventory_fefo',
  '/inventory': 'inventory_fefo',
  'inventory_fefo': 'inventory_fefo',
  '/inventory_fefo': 'inventory_fefo',
  'fefo': 'inventory_fefo',
  '/fefo': 'inventory_fefo',
  'batches': 'inventory_fefo',
  '/batches': 'inventory_fefo',
  'stock': 'inventory_fefo',
  '/stock': 'inventory_fefo',

  // Khata Ledger aliases
  'khata': 'khata_ledger',
  '/khata': 'khata_ledger',
  'khata_ledger': 'khata_ledger',
  '/khata_ledger': 'khata_ledger',
  'credit': 'khata_ledger',
  '/credit': 'khata_ledger',
  'ledger': 'khata_ledger',
  '/ledger': 'khata_ledger',
  'farmer-credit': 'khata_ledger',
  '/farmer-credit': 'khata_ledger',

  // Procurement aliases
  'procurement': 'procurement',
  '/procurement': 'procurement',
  'purchase-orders': 'procurement',
  '/purchase-orders': 'procurement',
  'pos-orders': 'procurement',
  '/pos-orders': 'procurement',
  'suppliers': 'procurement',
  '/suppliers': 'procurement',
  'inward': 'procurement',
  '/inward': 'procurement',

  // Nursery Care aliases
  'nursery': 'nursery_care',
  '/nursery': 'nursery_care',
  'nursery_care': 'nursery_care',
  '/nursery_care': 'nursery_care',
  'greenhouse': 'nursery_care',
  '/greenhouse': 'nursery_care',
  'polyhouse': 'nursery_care',
  '/polyhouse': 'nursery_care',
  'plants': 'nursery_care',
  '/plants': 'nursery_care',

  // Compliance aliases
  'compliance': 'compliance',
  '/compliance': 'compliance',
  'licenses': 'compliance',
  '/licenses': 'compliance',
  'fco': 'compliance',
  '/fco': 'compliance',
  'regulatory': 'compliance',
  '/regulatory': 'compliance',
  'audit': 'compliance',
  '/audit': 'compliance',

  // Intelligence aliases
  'intelligence': 'intelligence',
  '/intelligence': 'intelligence',
  'seasonal': 'intelligence',
  '/seasonal': 'intelligence',
  'market-intelligence': 'intelligence',
  '/market-intelligence': 'intelligence',
  'advisory': 'intelligence',
  '/advisory': 'intelligence',

  // GST & Tax Reports aliases
  'gst-reports': 'gst_reports',
  '/gst-reports': 'gst_reports',
  'gst_reports': 'gst_reports',
  '/gst_reports': 'gst_reports',
  'gst': 'gst_reports',
  '/gst': 'gst_reports',
  'tax': 'gst_reports',
  '/tax': 'gst_reports',
  'gstr': 'gst_reports',
  '/gstr': 'gst_reports',

  // Users Directory aliases
  'users': 'users_directory',
  '/users': 'users_directory',
  'users_directory': 'users_directory',
  '/users_directory': 'users_directory',
  'staff': 'users_directory',
  '/staff': 'users_directory',
  'team': 'users_directory',
  '/team': 'users_directory',

  // Reset Password aliases
  'reset-password': 'reset_password',
  '/reset-password': 'reset_password',
  'reset_password': 'reset_password',
  '/reset_password': 'reset_password',
  'admin-users': 'users_directory',
  '/admin-users': 'users_directory',
  'security': 'users_directory',
  '/security': 'users_directory',

  // 404 alias
  '404': '404',
  '/404': '404',
};

// ==============================================================================
// 2. Modal & Dialog Mappings
// ==============================================================================
export const MODAL_ROUTES: Record<ModalType, string> = {
  none: '',
  new_sale: 'new-sale',
  create_po: 'create-po',
  record_khata: 'record-payment',
  plant_care: 'plant-care',
  stock_adjust: 'stock-adjust',
  quick_view_alerts: 'alerts',
  live_camera: 'live-camera',
  add_user: 'add-user',
  edit_user: 'edit-user',
  remove_user: 'remove-user',
  device_sessions: 'devices',
  change_password: 'change-password',
};

export const MODAL_ALIASES: Record<string, ModalType> = {
  '': 'none',
  'none': 'none',
  'new-sale': 'new_sale',
  'new_sale': 'new_sale',
  'sale': 'new_sale',
  'pos-bill': 'new_sale',
  'create-bill': 'new_sale',

  'create-po': 'create_po',
  'create_po': 'create_po',
  'new-po': 'create_po',
  'purchase-order': 'create_po',

  'record-payment': 'record_khata',
  'record_khata': 'record_khata',
  'record-khata': 'record_khata',
  'payment': 'record_khata',
  'settle-khata': 'record_khata',

  'plant-care': 'plant_care',
  'plant_care': 'plant_care',
  'care-task': 'plant_care',
  'new-task': 'plant_care',

  'stock-adjust': 'stock_adjust',
  'stock_adjust': 'stock_adjust',
  'variance': 'stock_adjust',
  'adjustment': 'stock_adjust',

  'alerts': 'quick_view_alerts',
  'quick_view_alerts': 'quick_view_alerts',
  'urgent-actions': 'quick_view_alerts',
  'notifications': 'quick_view_alerts',

  'live-camera': 'live_camera',
  'live_camera': 'live_camera',
  'cctv': 'live_camera',
  'camera': 'live_camera',

  'add-user': 'add_user',
  'add_user': 'add_user',
  'create-user': 'add_user',
  'new-staff': 'add_user',

  'edit-user': 'edit_user',
  'edit_user': 'edit_user',
  'update-user': 'edit_user',

  'remove-user': 'remove_user',
  'remove_user': 'remove_user',
  'delete-user': 'remove_user',
  'revoke-user': 'remove_user',

  'devices': 'device_sessions',
  'device_sessions': 'device_sessions',
  'device-sessions': 'device_sessions',
  'active-devices': 'device_sessions',
  'sessions': 'device_sessions',

  'change-password': 'change_password',
  'change_password': 'change_password',
  'update-password': 'change_password',
  'password': 'change_password',
};

// ==============================================================================
// 3. Clean HTML5 Path Router Helper Functions (No Hash '#')
// ==============================================================================
export interface ParsedRoute {
  view: string;
  modal: ModalType;
  queryParams: Record<string, string>;
  rawPath: string;
  isNotFound: boolean;
}

/**
 * Parses current location pathname and search query string without any hash '#'
 */
export const parseLocation = (
  pathname: string = window.location.pathname,
  search: string = window.location.search,
  hash: string = window.location.hash
): ParsedRoute => {
  // If user entered a legacy hash URL (e.g. /#/command-center), migrate it cleanly
  let effectivePath = pathname;
  let effectiveSearch = search;

  if (hash && hash.startsWith('#')) {
    const cleanHash = hash.replace(/^#\/?/, '');
    const [hPath, hQuery] = cleanHash.split('?');
    if (hPath) effectivePath = `/${hPath}`;
    if (hQuery) effectiveSearch = `?${hQuery}`;
  }

  const rawPath = effectivePath.replace(/\/$/, '') || '/';
  const cleanPathKey = rawPath.toLowerCase();

  const queryParams: Record<string, string> = {};
  if (effectiveSearch) {
    const searchParams = new URLSearchParams(effectiveSearch);
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
  }

  // Parse modal from ?modal=...
  let modal: ModalType = 'none';
  if (queryParams.modal) {
    modal = MODAL_ALIASES[queryParams.modal.toLowerCase()] || 'none';
  }

  // Check if route exists in known aliases
  const mappedView = ROUTE_ALIASES[cleanPathKey];

  if (!mappedView) {
    // Unrecognized route -> Trigger 404
    return {
      view: '404',
      modal: 'none',
      queryParams,
      rawPath,
      isNotFound: true,
    };
  }

  return {
    view: mappedView,
    modal,
    queryParams,
    rawPath,
    isNotFound: false,
  };
};

/**
 * Builds a clean HTML5 URL path (e.g. /sales-pos?modal=new-sale)
 */
export const buildPathUrl = (
  view: string,
  modal: ModalType = 'none',
  queryParams: Record<string, string> = {}
): string => {
  const path = VIEW_ROUTES[view] || (view === '404' ? '/404' : `/${view}`);
  const modalSlug = MODAL_ROUTES[modal];

  const params = new URLSearchParams();
  if (modalSlug) {
    params.set('modal', modalSlug);
  }
  Object.entries(queryParams).forEach(([k, v]) => {
    if (k !== 'modal' && v) {
      params.set(k, v);
    }
  });

  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Updates browser URL via history.pushState or replaceState without reloading
 */
export const navigateTo = (
  view: string,
  modal: ModalType = 'none',
  replace = false,
  queryParams: Record<string, string> = {}
) => {
  const url = buildPathUrl(view, modal, queryParams);
  if (window.location.pathname + window.location.search !== url) {
    if (replace) {
      window.history.replaceState({ view, modal }, '', url);
    } else {
      window.history.pushState({ view, modal }, '', url);
    }
  }
};
