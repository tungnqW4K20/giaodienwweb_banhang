import math
from typing import List
from django.db.models import Q
from .models import Product

class ProductSimilarityService:
    """
    Intelligent Recommendation Engine.
    Computes multi-factor similarity score between target product and other catalog items:
    1. Category match (Weight: 40%)
    2. Seasonality match (Weight: 25%)
    3. Price proximity ratio (Weight: 20%)
    4. Tag token overlap (Weight: 15%)
    """

    @staticmethod
    def get_similar_products(product: Product, limit: int = 4) -> List[Product]:
        candidates = Product.objects.filter(is_available=True).exclude(id=product.id).select_related('category')
        
        target_tags = set([t.strip().lower() for t in (product.tags or "").split(",") if t.strip()])
        target_price = float(product.price)

        scored_products = []
        for cand in candidates:
            score = 0.0

            # 1. Category match
            if cand.category_id == product.category_id:
                score += 40.0

            # 2. Season match
            if cand.season == product.season:
                score += 25.0

            # 3. Price proximity (within 30% range gets high score)
            cand_price = float(cand.price)
            if target_price > 0 and cand_price > 0:
                price_ratio = min(cand_price, target_price) / max(cand_price, target_price)
                score += price_ratio * 20.0

            # 4. Tag overlap
            cand_tags = set([t.strip().lower() for t in (cand.tags or "").split(",") if t.strip()])
            if target_tags and cand_tags:
                intersection = len(target_tags.intersection(cand_tags))
                union = len(target_tags.union(cand_tags))
                if union > 0:
                    score += (intersection / union) * 15.0

            scored_products.append((score, cand))

        # Sort descending by similarity score
        scored_products.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_products[:limit]]
