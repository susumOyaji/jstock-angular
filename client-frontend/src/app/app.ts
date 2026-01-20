import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Stock, Signal, PortfolioItem } from './api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  private api = inject(ApiService);

  stocks = signal<Stock[]>([]);
  signals = signal<Signal[]>([]);
  portfolioItems = signal<PortfolioItem[]>([]);
  logs = signal<string[]>([]);
  loading = signal(false);

  // Form for adding stock
  newStockCode = '';
  newStockName = '';
  isLookingUp = false;

  // Custom Modal State
  isModalOpen = signal(false);
  stockToDelete = signal<string | null>(null);

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.api.getStocks().subscribe(data => this.stocks.set(data));
    this.api.getSignals().subscribe(data => this.signals.set(data));
    this.api.getPortfolio().subscribe(data => this.portfolioItems.set(data));
  }

  handleUpdate() {
    this.loading.set(true);
    this.logs.set(['Starting analysis...']);
    this.api.runUpdate().subscribe({
      next: (res) => {
        this.logs.set(res.logs);
        this.refreshData();
        this.loading.set(false);
      },
      error: (err) => {
        this.logs.set(['Error occurred during update: ' + err.message]);
        this.loading.set(false);
      }
    });
  }

  handleAddStock() {
    if (!this.newStockCode || !this.newStockName) return;
    this.api.addStock({ code: this.newStockCode, name: this.newStockName }).subscribe(() => {
      this.newStockCode = '';
      this.newStockName = '';
      this.refreshData();
    });
  }

  handleDeleteStock(code: string) {
    this.stockToDelete.set(code);
    this.isModalOpen.set(true);
  }

  handleBuy(code: string, price: number) {
    console.log('🛒 handleBuy called:', { code, price });

    const shares = prompt(`[${code}] 何株購入しますか？`, '100');
    console.log('User entered shares:', shares);
    console.log('Type of shares:', typeof shares);
    console.log('shares is null?', shares === null);
    console.log('shares is empty string?', shares === '');

    if (shares !== null && shares !== '') {
      const parsedShares = parseInt(shares, 10);
      console.log('Parsed shares:', parsedShares);
      console.log('Is NaN?', isNaN(parsedShares));
    }

    if (!shares || isNaN(parseInt(shares || ''))) {
      console.log('❌ Invalid shares input, aborting');
      console.log('Reason: shares =', shares, ', isNaN(parseInt(shares || \'\')) =', isNaN(parseInt(shares || '')));
      return;
    }

    // At this point, shares is guaranteed to be a non-empty string
    const portfolioItem = {
      code,
      shares: parseInt(shares, 10),
      purchasePrice: price,
      purchaseDate: new Date().toISOString().split('T')[0]
    };

    console.log('📤 Sending to API:', portfolioItem);

    this.api.addToPortfolio(portfolioItem).subscribe({
      next: (response) => {
        console.log('✅ API Response:', response);
        alert(`購入しました: ${code} (${shares}株 @ ¥${price})`);
        this.refreshData();
      },
      error: (error) => {
        console.error('❌ API Error:', error);
        alert(`エラーが発生しました: ${error.message || 'Unknown error'}`);
      }
    });
  }

  handleSell(item: PortfolioItem) {
    if (confirm(`[${item.code}] ${item.name} を ${item.shares}株すべて売却しますか？`)) {
      this.api.removeFromPortfolio(item.id!).subscribe(() => {
        this.refreshData();
      });
    }
  }

  confirmDelete() {
    const code = this.stockToDelete();
    if (code) {
      this.api.deleteStock(code).subscribe(() => {
        this.refreshData();
        this.closeModal();
      });
    }
  }

  cancelDelete() {
    this.closeModal();
  }

  private closeModal() {
    this.isModalOpen.set(false);
    this.stockToDelete.set(null);
  }

  lookupStockInfo() {
    if (this.newStockCode.length >= 4) {
      this.isLookingUp = true;
      this.api.getStockInfo(this.newStockCode).subscribe({
        next: (info) => {
          this.newStockName = info.name;
          this.isLookingUp = false;
        },
        error: () => {
          this.isLookingUp = false;
        }
      });
    }
  }
}
