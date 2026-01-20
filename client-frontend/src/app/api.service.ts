import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Stock {
    code: string;
    name: string;
    market?: string;
    hasDataToday?: boolean;
    currentPrice?: number | null;
    prevClose?: number | null;
    lastUpdate?: string | null;
}

export interface Signal {
    id?: number;
    code: string;
    date: string;
    type: string;
    targetPrice: number;
    tp: number;
    sl: number;
    reason?: string;
}

export interface PortfolioItem {
    id?: number;
    code: string;
    name?: string;
    shares: number;
    purchasePrice: number;
    purchaseDate: string;
    currentPrice?: number | null;
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private http = inject(HttpClient);
    private baseUrl = 'http://localhost:3001/api';

    getStocks(): Observable<Stock[]> {
        return this.http.get<Stock[]>(`${this.baseUrl}/stocks`);
    }

    getSignals(): Observable<Signal[]> {
        return this.http.get<Signal[]>(`${this.baseUrl}/signals`);
    }

    runUpdate(): Observable<{ success: boolean; logs: string[] }> {
        return this.http.post<{ success: boolean; logs: string[] }>(`${this.baseUrl}/update`, {});
    }

    addStock(stock: Partial<Stock>): Observable<any> {
        return this.http.post(`${this.baseUrl}/stocks`, stock);
    }

    deleteStock(code: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/stocks/${code}`);
    }

    getStockInfo(code: string): Observable<{ code: string, name: string, market: string }> {
        return this.http.get<{ code: string, name: string, market: string }>(`${this.baseUrl}/stocks/info/${code}`);
    }

    getPortfolio(): Observable<PortfolioItem[]> {
        return this.http.get<PortfolioItem[]>(`${this.baseUrl}/portfolio`);
    }

    addToPortfolio(item: Partial<PortfolioItem>): Observable<any> {
        return this.http.post(`${this.baseUrl}/portfolio`, item);
    }

    removeFromPortfolio(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/portfolio/${id}`);
    }
}
