import mongoose from 'mongoose';
import { Material, IMaterial } from './material.model.js';
import { Category, ICategory } from './category.model.js';
import { PriceHistory } from './priceHistory.model.js';
import {
  CreateCategoryInput,
  CreateMaterialInput,
  UpdateMaterialInput,
  MaterialQueryParams,
} from './material.schema.js';

export class MaterialService {
  private static defaultCategories = [
    { name: 'Balu', hindiName: 'बालू', description: 'Sand / Coarse sand / Fine sand' },
    { name: 'Char', hindiName: 'छर', description: 'Stone dust / 6mm chips' },
    { name: 'Gitti', hindiName: 'गिट्टी', description: 'Aggregates / 10mm, 20mm gravel' },
    { name: 'Cement', hindiName: 'सीमेंट', description: 'Portland pozzolana & composite cement bags' },
    { name: 'Steel', hindiName: 'सरिया / लोहा', description: 'TMT Rods 8mm, 10mm, 12mm, 16mm, binding wire' },
    { name: 'Bricks', hindiName: 'ईंट', description: 'Red clay bricks & fly ash blocks' },
    { name: 'Fittings & Misc', hindiName: 'अन्य सामग्री', description: 'Pipes, fittings & hardware' },
  ];

  static async seedDefaultCategories(): Promise<void> {
    const count = await Category.countDocuments();
    if (count === 0) {
      await Category.insertMany(this.defaultCategories);
    }
  }

  static async getCategories(): Promise<any[]> {
    await this.seedDefaultCategories();
    return Category.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  static async createCategory(input: CreateCategoryInput): Promise<ICategory> {
    const existing = await Category.findOne({ name: new RegExp(`^${input.name.trim()}$`, 'i') });
    if (existing) {
      const error = new Error('A category with this name already exists');
      (error as any).statusCode = 409;
      throw error;
    }

    const category = new Category({
      name: input.name,
      hindiName: input.hindiName,
      description: input.description,
    });

    await category.save();
    return category;
  }

  static async createMaterial(input: CreateMaterialInput, userId?: string): Promise<IMaterial> {
    const purchaseRate = Math.round(input.purchaseRate);
    const sellingRate = Math.round(input.sellingRate);

    const material = new Material({
      name: input.name,
      hindiName: input.hindiName,
      categoryId: input.categoryId ? new mongoose.Types.ObjectId(input.categoryId) : undefined,
      categoryName: input.categoryName,
      sku: input.sku,
      brand: input.brand,
      description: input.description,
      defaultUnit: input.defaultUnit,
      alternativeUnits: input.alternativeUnits || [],
      purchaseRate,
      sellingRate,
      currentStock: input.currentStock || 0,
      minimumStockAlert: input.minimumStockAlert ?? 10,
    });

    await material.save();

    // Record initial price history entry if rates are configured
    if (sellingRate > 0 || purchaseRate > 0) {
      await PriceHistory.create({
        materialId: material._id,
        effectiveDate: new Date(),
        oldSellingRate: 0,
        newSellingRate: sellingRate,
        oldPurchaseRate: 0,
        newPurchaseRate: purchaseRate,
        reason: 'Initial Catalog Price Setup',
        changedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });
    }

    return material;
  }

  static async getMaterials(query: MaterialQueryParams) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const filterConditions: any = { isActive: true };

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filterConditions.$or = [
        { name: searchRegex },
        { hindiName: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
      ];
    }

    if (query.category) {
      filterConditions.categoryName = new RegExp(`^${query.category.trim()}$`, 'i');
    }

    if (query.unit) {
      filterConditions.defaultUnit = query.unit;
    }

    if (query.lowStockOnly === 'true') {
      filterConditions.$expr = { $lte: ['$currentStock', '$minimumStockAlert'] };
    }

    const [materials, total] = await Promise.all([
      Material.find(filterConditions)
        .sort({ categoryName: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Material.countDocuments(filterConditions),
    ]);

    return {
      materials,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getMaterialById(id: string): Promise<IMaterial> {
    const material = await Material.findById(id);
    if (!material || !material.isActive) {
      const error = new Error('Material not found');
      (error as any).statusCode = 404;
      throw error;
    }
    return material;
  }

  static async updateMaterial(
    id: string,
    input: UpdateMaterialInput,
    userId?: string
  ): Promise<IMaterial> {
    const material = await this.getMaterialById(id);

    const oldSelling = material.sellingRate;
    const oldPurchase = material.purchaseRate;

    const newSelling = input.sellingRate !== undefined ? Math.round(input.sellingRate) : oldSelling;
    const newPurchase = input.purchaseRate !== undefined ? Math.round(input.purchaseRate) : oldPurchase;

    const priceChanged = newSelling !== oldSelling || newPurchase !== oldPurchase;

    // Apply updates
    if (input.name) material.name = input.name;
    if (input.hindiName !== undefined) material.hindiName = input.hindiName;
    if (input.categoryName) material.categoryName = input.categoryName;
    if (input.brand !== undefined) material.brand = input.brand;
    if (input.sku !== undefined) material.sku = input.sku;
    if (input.description !== undefined) material.description = input.description;
    if (input.defaultUnit) material.defaultUnit = input.defaultUnit;
    if (input.alternativeUnits) material.alternativeUnits = input.alternativeUnits;
    if (input.minimumStockAlert !== undefined) material.minimumStockAlert = input.minimumStockAlert;
    if (input.currentStock !== undefined) material.currentStock = input.currentStock;
    if (input.isActive !== undefined) material.isActive = input.isActive;

    material.sellingRate = newSelling;
    material.purchaseRate = newPurchase;

    await material.save();

    // If price changed, record historical rate entry
    if (priceChanged) {
      await PriceHistory.create({
        materialId: material._id,
        effectiveDate: new Date(),
        oldSellingRate: oldSelling,
        newSellingRate: newSelling,
        oldPurchaseRate: oldPurchase,
        newPurchaseRate: newPurchase,
        reason: input.priceChangeReason || 'Manual Price Update',
        changedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      });
    }

    return material;
  }

  static async getPriceHistory(materialId: string): Promise<any[]> {
    await this.getMaterialById(materialId); // Validate exists
    return PriceHistory.find({ materialId: new mongoose.Types.ObjectId(materialId) })
      .sort({ effectiveDate: -1 })
      .populate('changedBy', 'name email')
      .lean();
  }
}
