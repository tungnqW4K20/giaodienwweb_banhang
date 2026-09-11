from django.urls import path
from .views import CategoryListView, ProductListView, ProductDetailView, SimilarProductsView

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category_list'),
    path('', ProductListView.as_view(), name='product_list'),
    path('<str:identifier>/', ProductDetailView.as_view(), name='product_detail'),
    path('<int:product_id>/similar/', SimilarProductsView.as_view(), name='product_similar'),
]
