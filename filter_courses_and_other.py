#!/usr/bin/env python3
"""
Extract all products that are either courses (educational_course) or have category 'other'
"""

import json
import sys

def filter_courses_and_other(input_file, output_file):
    """
    Filter the JSON file to extract all products with category 'educational_course' or 'other'
    """
    print(f"Loading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Statistics
    total_users = 0
    users_with_filtered_products = 0
    total_filtered_products = 0
    
    # Filter users and their products
    filtered_users = {}
    
    for user_id, user_data in data.get('users', {}).items():
        total_users += 1
        products = user_data.get('products', [])
        
        # Filter products that are courses or have category 'other'
        filtered_products = [
            product for product in products
            if product.get('product_category') in ['educational_course', 'other']
        ]
        
        if filtered_products:
            users_with_filtered_products += 1
            total_filtered_products += len(filtered_products)
            
            # Create filtered user entry
            filtered_users[user_id] = {
                'user_info': user_data.get('user_info', {}),
                'products': filtered_products
            }
    
    # Create output structure
    output_data = {
        'metadata': {
            'original_total_users': data.get('metadata', {}).get('total_users', 0),
            'filtered_users_count': users_with_filtered_products,
            'total_filtered_products': total_filtered_products,
            'filter_criteria': 'educational_course or other',
            'description': 'Filtered data containing only courses (educational_course) and products with category "other"'
        },
        'users': filtered_users
    }
    
    print(f"\nStatistics:")
    print(f"  Original total users: {total_users}")
    print(f"  Users with filtered products: {users_with_filtered_products}")
    print(f"  Total filtered products: {total_filtered_products}")
    
    # Count by category
    course_count = sum(1 for user in filtered_users.values() 
                      for product in user['products'] 
                      if product.get('product_category') == 'educational_course')
    other_count = sum(1 for user in filtered_users.values() 
                     for product in user['products'] 
                     if product.get('product_category') == 'other')
    
    print(f"  Educational courses: {course_count}")
    print(f"  Other category: {other_count}")
    
    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"Done! Filtered data saved to {output_file}")

if __name__ == '__main__':
    input_file = 'moc-old-data/final_merged_data_cleaned.json'
    output_file = 'moc-old-data/courses_and_other_filtered.json'
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    filter_courses_and_other(input_file, output_file)





