/**
 * Sample Publisher Data
 * A curated dataset of publishers across various niches for demonstration
 *
 * This file contains:
 * 1. Curated sample publishers for specific niches (manually created)
 * 2. Integration with MBFC (Media Bias/Fact Check) scraped data (3,900+ publishers)
 *
 * Data Sources:
 * - MBFC Bias Data: https://github.com/idiap/Factual-Reporting-and-Political-Bias-Web-Interactions
 * - MBFC Corpus: https://github.com/ramybaly/News-Media-Reliability
 */

import { Publisher, PublisherCategory } from '../types';
import { generateId } from '../utils/helpers';
import {
  loadAllMBFCPublishers,
  filterByFactualReporting,
  filterByBias,
  getDatasetStats,
  MBFCPublisher
} from './mbfcDataLoader';

/**
 * Technology publishers
 */
export const technologyPublishers: Publisher[] = [
  {
    id: generateId(),
    domain: 'techcrunch.com',
    name: 'TechCrunch',
    description: 'Leading technology media property, dedicated to profiling startups and reviewing new Internet products',
    category: PublisherCategory.NEWS,
    topics: ['technology', 'startups', 'venture capital', 'AI', 'software'],
    metadata: { foundedYear: 2005 }
  },
  {
    id: generateId(),
    domain: 'wired.com',
    name: 'Wired',
    description: 'Monthly magazine focusing on how emerging technologies affect culture, the economy, and politics',
    category: PublisherCategory.MAGAZINE,
    topics: ['technology', 'science', 'culture', 'business', 'design'],
    metadata: { foundedYear: 1993 }
  },
  {
    id: generateId(),
    domain: 'theverge.com',
    name: 'The Verge',
    description: 'American technology news website covering science, technology, art, and culture',
    category: PublisherCategory.NEWS,
    topics: ['technology', 'gadgets', 'entertainment', 'science', 'culture'],
    metadata: { foundedYear: 2011 }
  },
  {
    id: generateId(),
    domain: 'arstechnica.com',
    name: 'Ars Technica',
    description: 'Technology news and information website covering hardware, software, and digital trends',
    category: PublisherCategory.NEWS,
    topics: ['technology', 'science', 'policy', 'gaming', 'security'],
    metadata: { foundedYear: 1998 }
  },
  {
    id: generateId(),
    domain: 'thenextweb.com',
    name: 'The Next Web',
    description: 'International technology news, business and culture publication',
    category: PublisherCategory.NEWS,
    topics: ['technology', 'startups', 'AI', 'business', 'innovation'],
    metadata: { foundedYear: 2006 }
  },
  {
    id: generateId(),
    domain: 'venturebeat.com',
    name: 'VentureBeat',
    description: 'Technology news site focused on transformative tech',
    category: PublisherCategory.NEWS,
    topics: ['AI', 'machine learning', 'enterprise', 'startups', 'gaming'],
    metadata: { foundedYear: 2006 }
  },
  {
    id: generateId(),
    domain: 'zdnet.com',
    name: 'ZDNet',
    description: 'Business technology news website',
    category: PublisherCategory.NEWS,
    topics: ['enterprise', 'cloud', 'security', 'digital transformation', 'AI'],
    metadata: { foundedYear: 1991 }
  },
  {
    id: generateId(),
    domain: 'cnet.com',
    name: 'CNET',
    description: 'Technology and consumer electronics media website',
    category: PublisherCategory.NEWS,
    topics: ['consumer electronics', 'technology', 'reviews', 'software', 'internet'],
    metadata: { foundedYear: 1994 }
  },
  {
    id: generateId(),
    domain: 'engadget.com',
    name: 'Engadget',
    description: 'Multilingual technology blog network',
    category: PublisherCategory.BLOG,
    topics: ['gadgets', 'consumer electronics', 'technology', 'gaming', 'entertainment'],
    metadata: { foundedYear: 2004 }
  },
  {
    id: generateId(),
    domain: 'gartner.com',
    name: 'Gartner',
    description: 'Research and advisory company providing information technology insights',
    category: PublisherCategory.INDUSTRY_ANALYST,
    topics: ['enterprise technology', 'IT strategy', 'digital transformation', 'AI', 'cloud'],
    metadata: { foundedYear: 1979 }
  },
  {
    id: generateId(),
    domain: 'forrester.com',
    name: 'Forrester Research',
    description: 'Research and advisory firm focusing on technology impact',
    category: PublisherCategory.INDUSTRY_ANALYST,
    topics: ['customer experience', 'technology strategy', 'digital business', 'security', 'AI'],
    metadata: { foundedYear: 1983 }
  },
  {
    id: generateId(),
    domain: 'mit.edu',
    name: 'MIT News',
    description: 'Massachusetts Institute of Technology news and research',
    category: PublisherCategory.ACADEMIC,
    topics: ['research', 'AI', 'robotics', 'engineering', 'science'],
    metadata: { foundedYear: 1861 }
  }
];

/**
 * Marketing publishers
 */
export const marketingPublishers: Publisher[] = [
  {
    id: generateId(),
    domain: 'marketingweek.com',
    name: 'Marketing Week',
    description: 'Leading UK marketing publication covering brands, media and agencies',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['marketing', 'branding', 'advertising', 'digital marketing', 'strategy'],
    metadata: { foundedYear: 1978 }
  },
  {
    id: generateId(),
    domain: 'adweek.com',
    name: 'Adweek',
    description: 'American advertising trade publication covering creative, client, media, and digital',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['advertising', 'marketing', 'media', 'creative', 'brands'],
    metadata: { foundedYear: 1979 }
  },
  {
    id: generateId(),
    domain: 'adage.com',
    name: 'Ad Age',
    description: 'Global media brand for marketing news, insights, and data',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['advertising', 'marketing', 'media', 'agencies', 'brands'],
    metadata: { foundedYear: 1930 }
  },
  {
    id: generateId(),
    domain: 'hubspot.com',
    name: 'HubSpot Blog',
    description: 'Marketing, sales, and customer service blog',
    category: PublisherCategory.BLOG,
    topics: ['inbound marketing', 'content marketing', 'SEO', 'sales', 'CRM'],
    metadata: { foundedYear: 2006 }
  },
  {
    id: generateId(),
    domain: 'moz.com',
    name: 'Moz Blog',
    description: 'SEO software and resources blog',
    category: PublisherCategory.BLOG,
    topics: ['SEO', 'search marketing', 'content marketing', 'link building', 'analytics'],
    metadata: { foundedYear: 2004 }
  },
  {
    id: generateId(),
    domain: 'contentmarketinginstitute.com',
    name: 'Content Marketing Institute',
    description: 'Content marketing education and training organization',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['content marketing', 'strategy', 'storytelling', 'B2B marketing', 'content strategy'],
    metadata: { foundedYear: 2007 }
  },
  {
    id: generateId(),
    domain: 'searchengineland.com',
    name: 'Search Engine Land',
    description: 'News and information about search engines and search marketing',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['SEO', 'PPC', 'search marketing', 'Google', 'digital marketing'],
    metadata: { foundedYear: 2006 }
  },
  {
    id: generateId(),
    domain: 'marketingland.com',
    name: 'MarTech',
    description: 'Marketing technology news publication',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['martech', 'marketing automation', 'analytics', 'CRM', 'digital marketing'],
    metadata: { foundedYear: 2011 }
  },
  {
    id: generateId(),
    domain: 'digiday.com',
    name: 'Digiday',
    description: 'Digital media, marketing and advertising publication',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['digital media', 'advertising', 'publishing', 'marketing', 'technology'],
    metadata: { foundedYear: 2008 }
  },
  {
    id: generateId(),
    domain: 'emarketer.com',
    name: 'eMarketer',
    description: 'Digital marketing, media and commerce research',
    category: PublisherCategory.INDUSTRY_ANALYST,
    topics: ['digital marketing', 'ecommerce', 'advertising', 'social media', 'mobile'],
    metadata: { foundedYear: 1996 }
  }
];

/**
 * Finance publishers
 */
export const financePublishers: Publisher[] = [
  {
    id: generateId(),
    domain: 'wsj.com',
    name: 'Wall Street Journal',
    description: 'American business-focused, international daily newspaper',
    category: PublisherCategory.NEWS,
    topics: ['finance', 'business', 'markets', 'economy', 'investing'],
    metadata: { foundedYear: 1889 }
  },
  {
    id: generateId(),
    domain: 'ft.com',
    name: 'Financial Times',
    description: 'International daily newspaper focusing on business and economic news',
    category: PublisherCategory.NEWS,
    topics: ['finance', 'business', 'economics', 'markets', 'politics'],
    metadata: { foundedYear: 1888 }
  },
  {
    id: generateId(),
    domain: 'bloomberg.com',
    name: 'Bloomberg',
    description: 'Global business and financial information and news leader',
    category: PublisherCategory.NEWS,
    topics: ['finance', 'markets', 'business', 'technology', 'economics'],
    metadata: { foundedYear: 1981 }
  },
  {
    id: generateId(),
    domain: 'reuters.com',
    name: 'Reuters',
    description: 'International news organization covering business, finance, and breaking news',
    category: PublisherCategory.NEWS,
    topics: ['news', 'finance', 'business', 'markets', 'world events'],
    metadata: { foundedYear: 1851 }
  },
  {
    id: generateId(),
    domain: 'cnbc.com',
    name: 'CNBC',
    description: 'American business news channel and website',
    category: PublisherCategory.NEWS,
    topics: ['business', 'finance', 'markets', 'investing', 'economy'],
    metadata: { foundedYear: 1989 }
  },
  {
    id: generateId(),
    domain: 'finextra.com',
    name: 'Finextra',
    description: 'Financial technology news and information',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['fintech', 'banking', 'payments', 'blockchain', 'digital banking'],
    metadata: { foundedYear: 1999 }
  },
  {
    id: generateId(),
    domain: 'americanbanker.com',
    name: 'American Banker',
    description: 'Banking and financial services trade publication',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['banking', 'fintech', 'regulation', 'payments', 'lending'],
    metadata: { foundedYear: 1836 }
  },
  {
    id: generateId(),
    domain: 'mckinsey.com',
    name: 'McKinsey & Company',
    description: 'Global management consulting firm with business insights',
    category: PublisherCategory.INDUSTRY_ANALYST,
    topics: ['strategy', 'management', 'finance', 'digital transformation', 'operations'],
    metadata: { foundedYear: 1926 }
  }
];

/**
 * Healthcare publishers
 */
export const healthcarePublishers: Publisher[] = [
  {
    id: generateId(),
    domain: 'statnews.com',
    name: 'STAT News',
    description: 'Health-oriented news website covering medical and scientific discoveries',
    category: PublisherCategory.NEWS,
    topics: ['healthcare', 'medicine', 'biotech', 'pharmaceuticals', 'research'],
    metadata: { foundedYear: 2015 }
  },
  {
    id: generateId(),
    domain: 'fiercehealthcare.com',
    name: 'Fierce Healthcare',
    description: 'Healthcare industry news and analysis',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['healthcare', 'hospitals', 'health policy', 'digital health', 'insurance'],
    metadata: { foundedYear: 2005 }
  },
  {
    id: generateId(),
    domain: 'healthcareitnews.com',
    name: 'Healthcare IT News',
    description: 'Healthcare information technology news',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['health IT', 'digital health', 'EHR', 'telemedicine', 'healthcare technology'],
    metadata: { foundedYear: 2004 }
  },
  {
    id: generateId(),
    domain: 'nejm.org',
    name: 'New England Journal of Medicine',
    description: 'Peer-reviewed medical journal and website',
    category: PublisherCategory.ACADEMIC,
    topics: ['medicine', 'clinical research', 'medical studies', 'healthcare', 'science'],
    metadata: { foundedYear: 1812 }
  },
  {
    id: generateId(),
    domain: 'nature.com',
    name: 'Nature',
    description: 'International weekly journal of science',
    category: PublisherCategory.ACADEMIC,
    topics: ['science', 'research', 'biology', 'medicine', 'technology'],
    metadata: { foundedYear: 1869 }
  },
  {
    id: generateId(),
    domain: 'nih.gov',
    name: 'NIH News',
    description: 'National Institutes of Health news and research updates',
    category: PublisherCategory.GOVERNMENT,
    topics: ['medical research', 'health', 'clinical trials', 'disease', 'public health'],
    metadata: { foundedYear: 1887 }
  },
  {
    id: generateId(),
    domain: 'mobihealthnews.com',
    name: 'MobiHealthNews',
    description: 'Mobile health and digital health news',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['digital health', 'mobile health', 'wearables', 'telemedicine', 'health apps'],
    metadata: { foundedYear: 2008 }
  }
];

/**
 * E-commerce publishers
 */
export const ecommercePublishers: Publisher[] = [
  {
    id: generateId(),
    domain: 'digitalcommerce360.com',
    name: 'Digital Commerce 360',
    description: 'E-commerce news, data and analysis',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['ecommerce', 'retail', 'B2B', 'digital commerce', 'marketplaces'],
    metadata: { foundedYear: 1999 }
  },
  {
    id: generateId(),
    domain: 'retaildive.com',
    name: 'Retail Dive',
    description: 'Retail industry news and trends',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['retail', 'ecommerce', 'consumer behavior', 'supply chain', 'technology'],
    metadata: { foundedYear: 2012 }
  },
  {
    id: generateId(),
    domain: 'practicalecommerce.com',
    name: 'Practical Ecommerce',
    description: 'Ecommerce news, how-tos, and strategy',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['ecommerce', 'online retail', 'marketing', 'payments', 'shipping'],
    metadata: { foundedYear: 2005 }
  },
  {
    id: generateId(),
    domain: 'shopify.com',
    name: 'Shopify Blog',
    description: 'Ecommerce tips and entrepreneurship advice',
    category: PublisherCategory.BLOG,
    topics: ['ecommerce', 'entrepreneurship', 'online business', 'marketing', 'dropshipping'],
    metadata: { foundedYear: 2006 }
  },
  {
    id: generateId(),
    domain: 'bigcommerce.com',
    name: 'BigCommerce Blog',
    description: 'Ecommerce insights and best practices',
    category: PublisherCategory.BLOG,
    topics: ['ecommerce', 'B2B', 'omnichannel', 'SEO', 'conversion'],
    metadata: { foundedYear: 2009 }
  }
];

/**
 * Sustainability publishers
 */
export const sustainabilityPublishers: Publisher[] = [
  {
    id: generateId(),
    domain: 'greenbiz.com',
    name: 'GreenBiz',
    description: 'Sustainable business news and resources',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['sustainability', 'clean technology', 'ESG', 'corporate responsibility', 'climate'],
    metadata: { foundedYear: 2000 }
  },
  {
    id: generateId(),
    domain: 'sustainablebrands.com',
    name: 'Sustainable Brands',
    description: 'Brand innovation and sustainability community',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['sustainability', 'branding', 'corporate sustainability', 'innovation', 'ESG'],
    metadata: { foundedYear: 2006 }
  },
  {
    id: generateId(),
    domain: 'edie.net',
    name: 'edie',
    description: 'Sustainability and environmental news',
    category: PublisherCategory.TRADE_PUBLICATION,
    topics: ['sustainability', 'energy', 'environment', 'climate', 'business'],
    metadata: { foundedYear: 1998 }
  },
  {
    id: generateId(),
    domain: 'cleantech.com',
    name: 'Cleantech Group',
    description: 'Clean technology and innovation research',
    category: PublisherCategory.INDUSTRY_ANALYST,
    topics: ['cleantech', 'renewable energy', 'sustainability', 'innovation', 'investment'],
    metadata: { foundedYear: 2002 }
  },
  {
    id: generateId(),
    domain: 'epa.gov',
    name: 'EPA News',
    description: 'Environmental Protection Agency news and data',
    category: PublisherCategory.GOVERNMENT,
    topics: ['environment', 'regulation', 'climate', 'pollution', 'sustainability'],
    metadata: { foundedYear: 1970 }
  }
];

/**
 * Get all sample publishers
 */
export function getAllPublishers(): Publisher[] {
  return [
    ...technologyPublishers,
    ...marketingPublishers,
    ...financePublishers,
    ...healthcarePublishers,
    ...ecommercePublishers,
    ...sustainabilityPublishers
  ];
}

/**
 * Get publishers by niche ID (curated sample data)
 */
export function getPublishersByNiche(nicheId: string): Publisher[] {
  const nicheMap: Record<string, Publisher[]> = {
    technology: technologyPublishers,
    marketing: marketingPublishers,
    finance: financePublishers,
    healthcare: healthcarePublishers,
    ecommerce: ecommercePublishers,
    sustainability: sustainabilityPublishers,
    enterprise: technologyPublishers.filter(p =>
      p.topics.some(t => ['enterprise', 'cloud', 'software', 'digital transformation'].includes(t))
    ),
    media: [...technologyPublishers, ...marketingPublishers].filter(p =>
      p.topics.some(t => ['media', 'content', 'publishing', 'social media'].includes(t))
    )
  };

  return nicheMap[nicheId] || getAllPublishers();
}

// ============================================================================
// MBFC (Media Bias/Fact Check) Data Integration
// Real scraped data from 3,900+ news publishers
// ============================================================================

let mbfcPublishersCache: MBFCPublisher[] | null = null;

/**
 * Get all publishers from MBFC dataset (3,900+ publishers)
 * Data is cached after first load for performance
 */
export function getMBFCPublishers(): MBFCPublisher[] {
  if (!mbfcPublishersCache) {
    mbfcPublishersCache = loadAllMBFCPublishers();
  }
  return mbfcPublishersCache;
}

/**
 * Get high-quality publishers from MBFC (high factual reporting only)
 * These are the most reliable sources for AI visibility
 */
export function getHighQualityMBFCPublishers(): MBFCPublisher[] {
  const allPublishers = getMBFCPublishers();
  return filterByFactualReporting(allPublishers, ['high']);
}

/**
 * Get neutral/center publishers from MBFC
 * These tend to be the most cited in AI training data
 */
export function getNeutralMBFCPublishers(): MBFCPublisher[] {
  const allPublishers = getMBFCPublishers();
  return filterByBias(allPublishers, ['neutral', 'left-center', 'right-center']);
}

/**
 * Get MBFC publishers filtered by both quality and bias
 */
export function getFilteredMBFCPublishers(options: {
  factualReporting?: string[];
  bias?: string[];
}): MBFCPublisher[] {
  let publishers = getMBFCPublishers();

  if (options.factualReporting && options.factualReporting.length > 0) {
    publishers = filterByFactualReporting(publishers, options.factualReporting);
  }

  if (options.bias && options.bias.length > 0) {
    publishers = filterByBias(publishers, options.bias);
  }

  return publishers;
}

/**
 * Get statistics about the MBFC dataset
 */
export function getMBFCDatasetStats() {
  const publishers = getMBFCPublishers();
  return getDatasetStats(publishers);
}

/**
 * Get all publishers - combines curated samples with MBFC data
 * Use 'source' parameter to specify which dataset to use:
 * - 'curated': Only hand-picked sample publishers (52)
 * - 'mbfc': Only MBFC scraped data (3,900+)
 * - 'all': Combined dataset (default)
 */
export function getAllPublishersExtended(source: 'curated' | 'mbfc' | 'all' = 'all'): Publisher[] {
  switch (source) {
    case 'curated':
      return getAllPublishers();
    case 'mbfc':
      return getMBFCPublishers();
    case 'all':
    default:
      // Combine both, with curated taking precedence for duplicates
      const curatedDomains = new Set(getAllPublishers().map(p => p.domain.toLowerCase()));
      const mbfcPublishers = getMBFCPublishers().filter(
        p => !curatedDomains.has(p.domain.toLowerCase())
      );
      return [...getAllPublishers(), ...mbfcPublishers];
  }
}

// Re-export MBFC types and utilities
export { MBFCPublisher, filterByFactualReporting, filterByBias, getDatasetStats };
