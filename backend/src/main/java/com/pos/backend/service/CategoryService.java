package com.pos.backend.service;

import com.pos.backend.dto.CategoryDtos;
import com.pos.backend.exception.BusinessException;
import com.pos.backend.exception.NotFoundException;
import com.pos.backend.model.Category;
import com.pos.backend.repository.CategoryRepository;
import com.pos.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<CategoryDtos.Response> list() {
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(CategoryDtos.Response::from).toList();
    }

    @Transactional
    public CategoryDtos.Response create(CategoryDtos.Request r) {
        String name = r.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("มีหมวดหมู่ชื่อ \"" + name + "\" แล้ว");
        }
        Category c = Category.builder()
                .name(name)
                .icon(blankToDefault(r.icon()))
                .active(r.active() == null || r.active())
                .sortOrder(r.sortOrder() == null ? 0 : r.sortOrder())
                .build();
        return CategoryDtos.Response.from(categoryRepository.save(c));
    }

    @Transactional
    public CategoryDtos.Response update(Long id, CategoryDtos.Request r) {
        Category c = find(id);
        String name = r.name().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new BusinessException("มีหมวดหมู่ชื่อ \"" + name + "\" แล้ว");
        }
        c.setName(name);
        c.setIcon(blankToDefault(r.icon()));
        if (r.active() != null) {
            c.setActive(r.active());
        }
        if (r.sortOrder() != null) {
            c.setSortOrder(r.sortOrder());
        }
        return CategoryDtos.Response.from(categoryRepository.save(c));
    }

    @Transactional
    public void delete(Long id) {
        Category c = find(id);
        if (productRepository.existsByCategoryId(id)) {
            throw new BusinessException("ลบไม่ได้ เพราะยังมีสินค้าในหมวดนี้");
        }
        categoryRepository.delete(c);
    }

    public Category find(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("ไม่พบหมวดหมู่ id: " + id));
    }

    private static String blankToDefault(String icon) {
        return icon == null || icon.isBlank() ? "apps" : icon.trim();
    }
}
