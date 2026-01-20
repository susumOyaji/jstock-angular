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
  newStockCode = signal('');
  newStockName = signal('');
  isLookingUp = signal(false);

  // Handle input changes
  onStockCodeChange(value: any) {
    const code = typeof value === 'string' ? value : (value.target?.value || '');
    this.newStockCode.set(code);
  }

  onStockNameChange(value: any) {
    const name = typeof value === 'string' ? value : (value.target?.value || '');
    this.newStockName.set(name);
  }

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
    if (!this.newStockCode() || !this.newStockName()) return;
    this.api.addStock({ code: this.newStockCode(), name: this.newStockName() }).subscribe(() => {
      this.newStockCode.set('');
      this.newStockName.set('');
      this.refreshData();
    });
  }

  handleDeleteStock(code: string) {
    this.stockToDelete.set(code);
    this.isModalOpen.set(true);
  }

  handleBuy(code: string, price: number) {
    const shares = prompt(`[${code}] 何株購入しますか？`, '100');

    if (!shares || isNaN(parseInt(shares || ''))) {
      return;
    }

    const portfolioItem = {
      code,
      shares: parseInt(shares, 10),
      purchasePrice: price,
      purchaseDate: new Date().toISOString().split('T')[0]
    };

    this.api.addToPortfolio(portfolioItem).subscribe({
      next: () => {
        alert(`購入しました: ${code} (${shares}株 @ ¥${price})`);
        this.refreshData();
      },
      error: (error) => {
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
    const code = this.newStockCode();
    if (code.length < 4) {
      alert('銘柄コードは4文字以上である必要があります');
      return;
    }
    this.isLookingUp.set(true);
    this.api.getStockInfo(code).subscribe({
      next: (info) => {
        this.newStockName.set(info.name);
        this.isLookingUp.set(false);
      },
      error: (err) => {
        alert(`銘柄情報取得エラー: ${err.status} ${err.statusText}`);
        this.isLookingUp.set(false);
      }
    });
  }
}
