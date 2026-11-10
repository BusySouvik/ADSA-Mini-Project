import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  Command,
  Headphones,
  Layers3,
  Menu,
  MousePointer2,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import "./App.css";

const features = [
  {
    number: "01",
    icon: Search,
    title: "Intelligent discovery",
    description:
      "Find exactly what you need with smart suggestions, fast product searches and precise price filtering.",
  },
  {
    number: "02",
    icon: Boxes,
    title: "Inventory under control",
    description:
      "Manage products, monitor stock levels and keep every inventory operation organized.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Insights that matter",
    description:
      "Understand your inventory through meaningful analytics, performance metrics and visual reports.",
  },
  {
    number: "04",
    icon: Layers3,
    title: "Powered by algorithms",
    description:
      "Experience efficient product indexing and retrieval through carefully designed data structures.",
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const featureTimer = window.setInterval(() => {
      setActiveFeature((current) => (current + 1) % features.length);
    }, 3500);

    return () => window.clearInterval(featureTimer);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll(
      ".features-section, .platform-section, .how-section, .cta-section, .feature-card, .platform-card, .how-step"
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    elements.forEach((element) => {
      element.classList.add("reveal-on-scroll");
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main>
      {/* NAVIGATION */}
      <header className="navbar">
        <a href="#" className="brand">
          <span className="brand-symbol">
            <Command size={19} />
          </span>
          <span>shop<span className="brand-dot">.</span>corner</span>
        </a>

        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        </nav>

        <div className="nav-actions">
          <a href="/login" className="nav-login">Log in</a>
          <a href="/register" className="button button-dark nav-cta">
            Get started <ArrowUpRight size={16} />
          </a>
        </div>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            SMARTER INVENTORY. BETTER DISCOVERY.
          </div>

          <h1>
            Smarter inventory.
            <br />
            <span>Better discovery.</span>
          </h1>

          <p className="hero-description">
            One intelligent platform for product discovery and inventory
            management. Built to make every operation simpler, faster and
            smarter.
          </p>

          <div className="hero-actions">
            <a href="/register" className="button button-orange">
              Explore Shop-Corner <ArrowUpRight size={18} />
            </a>
            <a href="#features" className="text-link">
              Discover the platform <ArrowRight size={17} />
            </a>
          </div>

          <div className="hero-proof">
            <ShieldCheck size={19} />
            <span>One platform. Two experiences. Smarter operations.</span>
          </div>

          <div className="hero-algorithm-note">
            <span className="algorithm-note-line"></span>
            <div>
              <span className="algorithm-note-label">INTELLIGENCE UNDER THE HOOD</span>
              <h3>Built on smart algorithms.<br />Designed for real operations.</h3>
              <p>
                From instant product lookup to efficient inventory organization,
                data structures make every operation smarter.
              </p>
              <div className="algorithm-tags">
                <span>AVL Trees</span>
                <span>Hash Tables</span>
                <span>Tries</span>
                <span>Heaps</span>
              </div>
            </div>
          </div>
        </div>

        {/* COMBINED OWNER + CUSTOMER VISUAL */}
        <div className="hero-visual combined-visual">
          <div className="visual-topline">
            <span>THE SHOP-CORNER EXPERIENCE</span>
            <span className="live-indicator">
              <span /> PLATFORM PREVIEW
            </span>
          </div>

          {/* OWNER DASHBOARD */}
          <div className="dashboard-card">
            <div className="dashboard-header">
              <div>
                <span className="dashboard-label">OWNER DASHBOARD</span>
                <h3>Your inventory, at a glance.</h3>
                <p>A smarter overview of your store.</p>
              </div>
              <div className="avatar">S</div>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <span>Total products</span>
                <strong>2,480</strong>
                <small><TrendingUp size={13} /> Inventory overview</small>
              </div>
              <div className="stat-card">
                <span>Available stock</span>
                <strong>8,920</strong>
                <small>Across all categories</small>
              </div>
            </div>

            <div className="inventory-panel">
              <div className="panel-heading">
                <div>
                  <span className="dashboard-label">INVENTORY HEALTH</span>
                  <h4>Stock distribution</h4>
                </div>
                <span className="panel-period">Overview</span>
              </div>

              <div className="inventory-bar">
                <span className="bar-in-stock" />
                <span className="bar-low" />
                <span className="bar-out" />
              </div>

              <div className="legend">
                <span><i className="legend-orange" /> In stock <b>78%</b></span>
                <span><i className="legend-dark" /> Low stock <b>16%</b></span>
                <span><i className="legend-muted" /> Out <b>6%</b></span>
              </div>
            </div>

            <div className="dashboard-bottom">
              <div className="bottom-icon"><Boxes size={17} /></div>
              <div>
                <strong>Inventory, organized.</strong>
                <p>Everything you need in one place.</p>
              </div>
              <ArrowUpRight size={18} className="bottom-arrow" />
            </div>
          </div>

          {/* CUSTOMER PRODUCT SHOWCASE */}
          <div className="product-showcase">
            <div className="product-showcase-heading">
              <div>
                <span className="dashboard-label">CUSTOMER EXPERIENCE</span>
                <h4>Discover your next favourite.</h4>
              </div>
              <ShoppingBag size={21} />
            </div>

            <div className="product-preview-grid">
              <article className="preview-product">
                <div className="preview-product-art art-headphones">
                  <Headphones size={43} strokeWidth={1.5} />
                </div>
                <span className="product-category">AUDIO</span>
                <strong>Studio Headphones</strong>
                <span className="product-price">₹2,499</span>
              </article>

              <article className="preview-product">
                <div className="preview-product-art art-watch">
                  <div className="watch-shape">
                    <div />
                  </div>
                </div>
                <span className="product-category">ACCESSORIES</span>
                <strong>Smart Watch</strong>
                <span className="product-price">₹3,999</span>
              </article>

              <article className="preview-product">
                <div className="preview-product-art art-mouse">
                  <MousePointer2 size={43} strokeWidth={1.5} />
                </div>
                <span className="product-category">TECH</span>
                <strong>Wireless Mouse</strong>
                <span className="product-price">₹799</span>
              </article>
            </div>
          </div>

          <div className="floating-note">
            <div className="floating-note-icon"><Sparkles size={17} /></div>
            <div>
              <strong>Smart product discovery</strong>
              <span>Powered by intelligent indexing</span>
            </div>
            <Check size={17} className="floating-check" />
          </div>

          <div className="orbit-chip orbit-chip-stock">
            <span className="orbit-dot" />
            Stock levels monitored
          </div>

          <div className="orbit-chip orbit-chip-search">
            <Search size={14} />
            Fast product search
          </div>

          <div className="orbit-chip orbit-chip-algorithm">
            <Layers3 size={14} />
            Smart indexing
          </div>

          <div className="activity-toast">
            <div className="activity-toast-icon"><TrendingUp size={16} /></div>
            <div>
              <strong>Inventory insights</strong>
              <span>Everything in one overview</span>
            </div>
            <span className="activity-pulse" />
          </div>
        </div>
      </section>

      {/* TECHNOLOGY */}
      <section className="technology-strip">
        <p>INTELLIGENCE BUILT INTO EVERY OPERATION</p>
        <div className="technology-list technology-ticker">
          <span><Command size={17} /> AVL TREES</span>
          <span><Layers3 size={17} /> HASH TABLES</span>
          <span><Search size={17} /> TRIES</span>
          <span><TrendingUp size={17} /> HEAPS</span>
          <span><Boxes size={17} /> QUEUES</span>
          <span aria-hidden="true"><Command size={17} /> AVL TREES</span>
          <span aria-hidden="true"><Layers3 size={17} /> HASH TABLES</span>
          <span aria-hidden="true"><Search size={17} /> TRIES</span>
          <span aria-hidden="true"><TrendingUp size={17} /> HEAPS</span>
          <span aria-hidden="true"><Boxes size={17} /> QUEUES</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section section-pad" id="features">
        <div className="section-heading">
          <div>
            <span className="section-kicker">WHAT MAKES US DIFFERENT</span>
            <h2>Everything works<br /><span>better together.</span></h2>
          </div>
          <p>
            More than product management. A connected system designed around
            the way modern inventory and shopping should work.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className={`feature-card ${activeFeature === Number(feature.number) - 1 ? "feature-active" : ""}`} key={feature.number} onMouseEnter={() => setActiveFeature(Number(feature.number) - 1)}>
                <div className="feature-card-top">
                  <div className="feature-icon"><Icon size={21} /></div>
                  <span>{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <a href="#how-it-works">
                  Explore <ArrowUpRight size={16} />
                </a>
                <div className="feature-progress">
                  <span />
                </div>
              </article>
            );
          })}
        </div>

        <div className="feature-spotlight">
          <div className="spotlight-copy">
            <span className="spotlight-kicker">EXPLORE THE EXPERIENCE</span>
            <h3>{features[activeFeature].title}</h3>
            <p>{features[activeFeature].description}</p>
            <a href="#platform" className="spotlight-link">
              See how it works <ArrowRight size={16} />
            </a>
          </div>

          <div className="spotlight-navigation">
            <span className="spotlight-count">
              0{activeFeature + 1} <i>/ 04</i>
            </span>
            <div className="spotlight-dots">
              {features.map((feature, index) => (
                <button
                  key={feature.number}
                  type="button"
                  className={activeFeature === index ? "spotlight-dot active" : "spotlight-dot"}
                  onClick={() => setActiveFeature(index)}
                  aria-label={`Show ${feature.title}`}
                  aria-pressed={activeFeature === index}
                />
              ))}
            </div>
            <span className="spotlight-hint">SELECT A FEATURE</span>
          </div>
        </div>
      </section>

      {/* ADMIN AND CUSTOMER */}
      <section className="platform-section section-pad" id="platform">
        <div className="platform-intro">
          <span className="section-kicker">DESIGNED FOR EVERY SIDE</span>
          <h2>One platform.<br /><span>Two perspectives.</span></h2>
          <p>
            A connected experience for the people who manage products
            and the people who discover them.
          </p>
        </div>

        <div className="platform-grid upgraded-platform-grid">

          {/* ADMIN APPLICATION PREVIEW */}
          <article className="platform-card owner-card upgraded-platform-card">
            <div className="platform-card-heading">
              <div className="platform-icon"><ShieldCheck size={24} /></div>
              <span className="platform-label">01 / BUSINESS OWNERS</span>
            </div>

            <h3>Run your store.<br />Own every detail.</h3>
            <p>
              A centralized workspace to manage products, monitor inventory
              and make informed business decisions.
            </p>

            <div className="admin-preview">
              <div className="admin-preview-top">
                <div>
                  <span>STORE OVERVIEW</span>
                  <strong>Inventory dashboard</strong>
                </div>
                <div className="admin-preview-avatar">A</div>
              </div>

              <div className="admin-mini-stats">
                <div>
                  <span>Total products</span>
                  <strong>2,480</strong>
                  <small>Product catalogue</small>
                </div>
                <div>
                  <span>Stock available</span>
                  <strong>8,920</strong>
                  <small>Units in inventory</small>
                </div>
              </div>

              <div className="admin-stock-preview">
                <div className="admin-stock-heading">
                  <strong>Stock health</strong>
                  <span>Overview</span>
                </div>
                <div className="admin-stock-track">
                  <i></i><i></i><i></i>
                </div>
                <div className="admin-stock-legend">
                  <span><i></i> Healthy</span>
                  <span><i></i> Low stock</span>
                  <span><i></i> Out</span>
                </div>
              </div>

              <div className="admin-alert">
                <span className="admin-alert-dot"></span>
                <div>
                  <strong>Inventory monitoring</strong>
                  <small>Keep track of stock levels</small>
                </div>
                <ArrowUpRight size={16} />
              </div>
            </div>

            <ul className="platform-benefits">
              <li><Check size={15} /> Product and inventory management</li>
              <li><Check size={15} /> Stock monitoring and alerts</li>
              <li><Check size={15} /> Analytics and performance insights</li>
            </ul>

            <a href="/register?role=owner" className="button button-orange platform-action">
              Explore owner experience <ArrowUpRight size={17} />
            </a>
          </article>

          {/* CUSTOMER APPLICATION PREVIEW */}
          <article className="platform-card customer-card upgraded-platform-card">
            <div className="platform-card-heading">
              <div className="platform-icon"><ShoppingBag size={24} /></div>
              <span className="platform-label">02 / CUSTOMERS</span>
            </div>

            <h3>Discover more.<br />Shop smarter.</h3>
            <p>
              A simple shopping experience with intelligent product discovery,
              convenient search and easy product browsing.
            </p>

            <div className="customer-preview">
              <div className="customer-search">
                <Search size={16} />
                <span>Search for products...</span>
                <span className="search-shortcut">⌘ K</span>
              </div>

              <div className="customer-category-row">
                <span className="category-active">All products</span>
                <span>Electronics</span>
                <span>Accessories</span>
              </div>

              <div className="customer-products">
                <div className="customer-product">
                  <div className="customer-product-art customer-art-one">
                    <Headphones size={39} strokeWidth={1.4} />
                  </div>
                  <span> AUDIO </span>
                  <strong>Studio Headphones</strong>
                  <b>₹2,499</b>
                </div>

                <div className="customer-product">
                  <div className="customer-product-art customer-art-two">
                    <div className="customer-watch">
                      <span></span>
                    </div>
                  </div>
                  <span> ACCESSORIES </span>
                  <strong>Smart Watch</strong>
                  <b>₹3,999</b>
                </div>

                <div className="customer-product">
                  <div className="customer-product-art customer-art-three">
                    <MousePointer2 size={39} strokeWidth={1.4} />
                  </div>
                  <span> TECH </span>
                  <strong>Wireless Mouse</strong>
                  <b>₹799</b>
                </div>
              </div>

              <div className="customer-preview-footer">
                <span><Check size={14} /> Product discovery made simple</span>
                <ShoppingBag size={17} />
              </div>
            </div>

            <ul className="platform-benefits customer-benefits">
              <li><Check size={15} /> Intelligent product search</li>
              <li><Check size={15} /> Category and price filters</li>
              <li><Check size={15} /> Simple product discovery</li>
            </ul>

            <a href="/shop" className="button button-dark platform-action">
              Explore shopping experience <ArrowUpRight size={17} />
            </a>
          </article>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section className="how-section section-pad" id="how-it-works">
        <div className="how-heading">
          <span className="section-kicker">BUILT WITH PURPOSE</span>
          <h2>Simple on the surface.<br /><span>Intelligent underneath.</span></h2>
          <p>
            Behind the clean experience is an engine powered by carefully
            selected data structures and algorithms.
          </p>
        </div>

        <div className="how-steps">
          {[
            ["01", "Organize", "Products are indexed using multiple data structures."],
            ["02", "Discover", "Search and filtering retrieve relevant products efficiently."],
            ["03", "Manage", "Inventory operations stay synchronized and organized."],
            ["04", "Improve", "Analytics help owners understand and improve operations."],
          ].map(([number, title, description]) => (
            <div className="how-step" key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <ChevronRight />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="about">
        <div className="cta-content">
          <span className="section-kicker">YOUR INVENTORY, REIMAGINED</span>
          <h2>Ready for a<br />smarter way forward?</h2>
          <p>Discover a more organized way to manage and explore products.</p>
          <a href="/register" className="button button-dark">
            Get started with Shop-Corner <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="cta-decoration">S<span>.</span>C</div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <a href="#" className="brand footer-brand">
          <span className="brand-symbol"><Command size={18} /></span>
          <span>shop<span className="brand-dot">.</span>corner</span>
        </a>
        <span className="footer-copy">Thoughtfully built for smarter inventory.</span>
        <div className="footer-links">
          <a href="#features">Features</a>
          <a href="#platform">Platform</a>
          <a href="#about">About</a>
        </div>
        <span className="copyright">© 2026 Shop-Corner</span>
      </footer>
    </main>
  );
}

export default App;






