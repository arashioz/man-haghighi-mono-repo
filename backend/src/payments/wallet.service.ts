import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    return wallet;
  }

  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return Number(wallet.balance);
  }

  async chargeWallet(
    userId: string,
    amount: number,
    invoiceId?: string,
    description?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const amountDecimal = new Decimal(amount);
    const newBalance = wallet.balance.plus(amountDecimal);

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        invoiceId,
        type: 'WALLET_CHARGE',
        amount: amountDecimal,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        description: description || 'شارژ کیف پول',
        status: 'PAID',
      },
    });

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    this.logger.log(`Wallet charged: User ${userId}, Amount: ${amount}, New Balance: ${newBalance}`);

    return {
      wallet,
      transaction,
      newBalance: Number(newBalance),
    };
  }

  async deductFromWallet(
    userId: string,
    amount: number,
    invoiceId?: string,
    description?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const amountDecimal = new Decimal(amount);
    const currentBalance = wallet.balance;

    if (currentBalance.lessThan(amountDecimal)) {
      throw new BadRequestException('موجودی کیف پول کافی نیست');
    }

    const newBalance = currentBalance.minus(amountDecimal);

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        walletId: wallet.id,
        invoiceId,
        type: 'WALLET_DEDUCTION',
        amount: amountDecimal,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: description || 'کسر از کیف پول',
        status: 'PAID',
      },
    });

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    this.logger.log(`Wallet deducted: User ${userId}, Amount: ${amount}, New Balance: ${newBalance}`);

    return {
      wallet,
      transaction,
      newBalance: Number(newBalance),
    };
  }

  async getWalletTransactions(userId: string, limit = 50) {
    const wallet = await this.getOrCreateWallet(userId);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: wallet.id,
      },
      include: {
        invoice: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return transactions;
  }
}

