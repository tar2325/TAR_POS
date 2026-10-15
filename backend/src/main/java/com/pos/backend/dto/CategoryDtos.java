package com.pos.backend.dto;

import com.pos.backend.model.Category;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CategoryDtos {
    private CategoryDtos() {
    }

    public record Request(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 50) String icon,
            Boolean active,
            Integer sortOrder) {
    }

    public record Response(Long id, String name, String icon, Boolean active, Integer sortOrder) {
        public static Response from(Category c) {
            return new Response(c.getId(), c.getName(), c.getIcon(), c.getActive(), c.getSortOrder());
        }
    }
}
